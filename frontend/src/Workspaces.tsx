import { useLocation, useNavigate } from 'react-router-dom';
import { useSharedRefresh } from './shared/refresh';
import { ProjectTasks } from './ProjectTasks';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { z } from 'zod';
import { apiClient, ApiError, type Self } from './api';
import {
  teamPage,
  projectPage,
  teamSchema,
  projectSchema,
  directoryPage,
  projectMembers,
  type Team,
  type Project,
} from './workspace-api';
import { failureMessage } from './auth-policy';
import { DataTable, Dialog, Field, Form, Loading, Toast } from './shared/components';
import { WorkloadView } from './ProjectInsights';
import { overviewSchema, type ProjectOverviewData } from './insights-api';
import { projectTypes, projectCategories } from '../../src/domain/project-metadata';
import { InitialTeamMembers, type InitialTeamMember } from './InitialTeamMembers';
const client = apiClient();
type Entity = Team | Project;
type Props = {
  self: Self;
  online: boolean;
  onFailure: (e: ApiError) => void;
  onSelfChange: () => void;
  onBoardChange?: (project?: Project) => void;
};
type Action = {
  kind: 'create' | 'edit' | 'archive' | 'members' | 'tasks' | 'workload';
  entity?: Entity;
  view?: 'overview';
};
/** Card progress from the project overview API; hidden when the viewer lacks P-07. */
function CardProgress({ id, online }: { id: number; online: boolean }) {
  const [data, setData] = useState<ProjectOverviewData | null>();
  useEffect(() => {
    const c = new AbortController();
    if (online)
      client
        .request(`/api/projects/${id}/overview`, {
          signal: c.signal,
          parse: (v) => overviewSchema.parse(v),
        })
        .then(setData, () => !c.signal.aborted && setData(null));
    return () => c.abort();
  }, [id, online]);
  if (!data) return <div className="card-progress" aria-hidden="true" />;
  const { todo, doing, review, done } = data.by_status;
  const part = (n: number) => `${data.total ? (n / data.total) * 100 : 0}%`;
  return (
    <>
      <div className="card-progress" role="img" aria-label={`${data.progress_percent}% done`}>
        <i className="s-done" style={{ width: part(done) }} />
        <i className="s-doing" style={{ width: part(doing) }} />
        <i className="s-review" style={{ width: part(review) }} />
        <i className="s-todo" style={{ width: part(todo) }} />
      </div>
      <small className="card-count">
        {data.total ? `${data.total} Tasks · ${data.done} Done` : 'No tasks yet'}
      </small>
    </>
  );
}
const isProject = (e: Entity): e is Project => 'owner_team_id' in e;
const manage = (e: Entity, self: Self) =>
  isProject(e) ? ['admin', 'lead'].includes(e.effective_access) : self.user.org_role === 'admin';
const parsePage = (kind: 'teams' | 'projects', v: unknown) =>
  kind === 'teams' ? teamPage.parse(v) : projectPage.parse(v);
const parseItem = (kind: 'teams' | 'projects', v: unknown) =>
  kind === 'teams'
    ? z.object({ item: teamSchema }).strict().parse(v).item
    : z.object({ item: projectSchema }).strict().parse(v).item;

export function Workspaces({
  kind,
  self,
  online,
  onFailure,
  onSelfChange,
  onBoardChange,
}: Props & { kind: 'teams' | 'projects' }) {
  const location = useLocation(),
    navigate = useNavigate();
  const selectedTeam = kind === 'teams' ? new URLSearchParams(location.search).get('team') : null;
  const selectedProject =
    kind === 'projects' ? new URLSearchParams(location.search).get('project') : null;
  const [data, setData] = useState<{ items: Entity[]; total: number; pageSize: number }>(),
    [page, setPage] = useState(1),
    [archived, setArchived] = useState(false),
    [reload, setReload] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [changed, setChanged] = useState(false),
    [action, setAction] = useState<Action>();
  useEffect(() => {
    const controller = new AbortController();
    void client
      .request(`/api/${kind}?page=${page}&pageSize=10&includeArchived=${archived}`, {
        signal: controller.signal,
        parse: (v) => parsePage(kind, v),
      })
      .then((v) => {
        if (!controller.signal.aborted) {
          setData(v);

          setLoading(false);
          setError('');
        }
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) {
          setData(undefined);
          setLoading(false);
          setError(failureMessage(e));
          if (e instanceof ApiError) onFailure(e);
        }
      });
    return () => controller.abort();
  }, [kind, page, archived, reload, self.view_revision, onFailure]);
  useSharedRefresh(
    async (signal) => {
      try {
        const v = await client.request(
          `/api/${kind}?page=${page}&pageSize=10&includeArchived=${archived}`,
          { signal, parse: (x) => parsePage(kind, x) },
        );
        let current: Entity | undefined;
        if (action?.entity) {
          for (let p = 1; ; p++) {
            const list = await client.request(
              `/api/${kind}?page=${p}&pageSize=100&includeArchived=true`,
              { signal, parse: (x) => parsePage(kind, x) },
            );
            current = list.items.find((e) => e.id === action.entity!.id);
            if (current || p * list.pageSize >= list.total) break;
          }
        }
        if (signal.aborted) return;
        setData(v);
        if (action?.entity) {
          if (!current || (action.kind !== 'tasks' && !manage(current, self))) {
            setAction(undefined);
            setChanged(false);
          } else setChanged(current.version !== action.entity.version);
        } else setChanged(false);
      } catch (e) {
        if (!signal.aborted && e instanceof ApiError) {
          onFailure(e);
          if ([401, 403, 404].includes(e.status)) {
            setData(undefined);
            setAction(undefined);
          }
        }
      }
    },
    online,
    kind,
  );
  useEffect(() => {
    let stopped = false;
    if (!selectedProject) return;
    if (!/^[1-9][0-9]*$/.test(selectedProject)) return;
    void latest('projects', Number(selectedProject))
      .then((entity) => {
        if (!stopped) setAction({ kind: 'tasks', entity });
      })
      .catch((e) => {
        if (!stopped && e instanceof ApiError) onFailure(e);
      });
    return () => {
      stopped = true;
    };
  }, [selectedProject, onFailure]);
  const activeProject =
    selectedProject &&
    action?.kind === 'tasks' &&
    action.entity &&
    isProject(action.entity) &&
    String(action.entity.id) === selectedProject
      ? action.entity
      : undefined;
  useEffect(() => {
    onBoardChange?.(activeProject);
    return () => onBoardChange?.(undefined);
  }, [activeProject, onBoardChange]);
  const canCreate =
    self.user.org_role === 'admin' ||
    (kind === 'projects' && self.effective_summary.lead_team_ids.length > 0);
  const refresh = () => {
    setLoading(true);
    setData(undefined);
    setReload((n) => n + 1);
  };
  const actionsFor = (e: Team | Project) => (
    <div className="row-actions" key={e.id}>
      {isProject(e) && (
        <button
          disabled={!online}
          onClick={() => {
            setAction({ kind: 'tasks', entity: e });
            navigate(`/projects?project=${e.id}`);
          }}
        >
          Tasks
        </button>
      )}
      {manage(e, self) && (
        <>
          <button
            disabled={!online || self.maintenance}
            onClick={() => setAction({ kind: 'edit', entity: e })}
          >
            Edit
          </button>
          <button
            disabled={!online || self.maintenance}
            onClick={() => setAction({ kind: 'archive', entity: e })}
          >
            {e.archived_at ? 'Unarchive' : 'Archive'}
          </button>
        </>
      )}
      {(kind === 'projects' || self.user.org_role === 'admin') && (
        <button disabled={!online} onClick={() => setAction({ kind: 'members', entity: e })}>
          Members
        </button>
      )}
      {/* FR-50 team workload: Admin, team Lead, or a member holding P-09 (server enforces). */}
      {!isProject(e) &&
        (self.user.org_role === 'admin' ||
          e.own_role === 'lead' ||
          (!!e.own_role && self.user.permission_keys.includes('P-09'))) && (
          <button disabled={!online} onClick={() => setAction({ kind: 'workload', entity: e })}>
            Workload
          </button>
        )}
    </div>
  );
  if (
    selectedProject &&
    action?.kind === 'tasks' &&
    action.entity &&
    isProject(action.entity) &&
    String(action.entity.id) === selectedProject
  )
    return (
      <ProjectTasks
        project={action.entity}
        initialView={action.view}
        {...{ self, online, onFailure }}
        onClose={() => {
          setAction(undefined);
          navigate('/projects');
        }}
      />
    );
  if (selectedTeam && /^[1-9][0-9]*$/.test(selectedTeam))
    return (
      <TeamDetails
        key={selectedTeam}
        id={Number(selectedTeam)}
        {...{ self, online, onFailure, onSelfChange }}
        onClose={() => navigate('/teams')}
      />
    );
  return (
    <div className={`workspace-manager ${kind === 'projects' ? 'project-directory' : ''}`}>
      {changed && (
        <Toast>Data changed. Your dialog draft is preserved. Saving checks the version.</Toast>
      )}
      {notice && <Toast>{notice}</Toast>}
      {error && <p role="alert">{error}</p>}
      <div className="toolbar">
        {canCreate && (
          <button
            disabled={!online || self.maintenance}
            onClick={() => setAction({ kind: 'create' })}
          >
            {kind === 'teams' ? 'Create team' : 'Create project'}
          </button>
        )}
        <label>
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => {
              setArchived(e.target.checked);
              setPage(1);
              refresh();
            }}
          />{' '}
          Include archived
        </label>
        <button disabled={!online} onClick={refresh}>
          Refresh list
        </button>
      </div>
      {loading ? (
        <Loading />
      ) : (
        data && (
          <>
            {kind === 'projects' ? (
              <div role="region" aria-label="Projects">
                {(
                  [
                    ['Active projects', data.items.filter(isProject).filter((e) => !e.archived_at)],
                    [
                      'Archived projects',
                      data.items.filter(isProject).filter((e) => e.archived_at),
                    ],
                  ] as const
                ).map(
                  ([title, list]) =>
                    list.length > 0 && (
                      <section key={title} className="project-card-section">
                        <h2>{title}</h2>
                        <div className="project-card-grid">
                          {list.map((e) => (
                            <article
                              key={e.id}
                              className={`project-directory-card ${e.archived_at ? 'archived' : ''}`}
                              onClick={(ev) => {
                                if (!online || (ev.target as Element).closest('.card-menu, button'))
                                  return;
                                setAction({ kind: 'tasks', entity: e, view: 'overview' });
                                navigate(`/projects?project=${e.id}`);
                              }}
                            >
                              <div className="project-card-band">
                                <span className="project-card-icon" aria-hidden="true">
                                  ▣
                                </span>
                                <span className="project-state">
                                  {e.archived_at ? 'Archived' : 'Active'}
                                </span>
                              </div>
                              <button
                                className="project-card-title"
                                disabled={!online}
                                onClick={() => {
                                  setAction({ kind: 'tasks', entity: e, view: 'overview' });
                                  navigate(`/projects?project=${e.id}`);
                                }}
                              >
                                {e.name}
                              </button>
                              <p>{e.description || 'Plan, organize and track your team’s work.'}</p>
                              <small className="card-team">{e.owner_team_name}</small>
                              <CardProgress id={e.id} online={online} />
                              <details className="card-menu">
                                <summary aria-label={`Project actions ${e.name}`}>•••</summary>
                                {actionsFor(e)}
                              </details>
                            </article>
                          ))}
                        </div>
                      </section>
                    ),
                )}
                {!data.items.length && <p>No projects to show</p>}
              </div>
            ) : (
              <div className="team-card-grid" role="region" aria-label="Teams">
                {data.items.map((e) => {
                  const members = (!isProject(e) && e.members) || [];
                  const leads = members.filter((m) => m.team_role === 'lead');
                  return (
                    <article
                      key={e.id}
                      className={`team-card ${e.archived_at ? 'archived' : ''}`}
                      onClick={(event) => {
                        if (!(event.target as HTMLElement).closest('a, button'))
                          navigate(`/teams?team=${e.id}`);
                      }}
                    >
                      <div className="team-card-head">
                        <span className="team-card-icon" aria-hidden="true">
                          {e.name.trim()[0]?.toUpperCase()}
                        </span>
                        <span className={`team-state ${e.archived_at ? 'archived' : ''}`}>
                          {e.archived_at ? 'Archived · Read only' : 'Active'}
                        </span>
                      </div>
                      <h3>
                        <button
                          className="team-card-title"
                          onClick={() => navigate(`/teams?team=${e.id}`)}
                        >
                          {e.name}
                        </button>
                      </h3>
                      <p>{e.description}</p>
                      <div className="team-card-meta">
                        <span>
                          Lead · {leads.map((m) => m.user.display_name).join(', ') || '—'}
                        </span>
                        <span>
                          {!isProject(e) && e.members === undefined
                            ? 'Member details · Admin only'
                            : `${members.length} Members`}
                        </span>
                      </div>
                      <div className="team-card-foot">
                        <span className="avatar-stack">
                          {members.slice(0, 5).map((m) => (
                            <span key={m.user.id} title={m.user.display_name}>
                              {m.user.display_name
                                .trim()
                                .split(/\s+/)
                                .map((w) => w[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase()}
                            </span>
                          ))}
                        </span>
                        <small>{isProject(e) ? '' : `My role · ${e.own_role ?? 'Admin'}`}</small>
                        <span className="team-card-open" aria-hidden="true">
                          View team →
                        </span>
                      </div>
                    </article>
                  );
                })}
                {!data.items.length && <p>No teams to show</p>}
              </div>
            )}
            <div className="toolbar">
              <button
                disabled={page === 1 || !online}
                onClick={() => {
                  setPage((p) => p - 1);
                  refresh();
                }}
              >
                Previous page
              </button>
              <span>
                Page {page} · Total {data.total} items
              </span>
              <button
                disabled={page * data.pageSize >= data.total || !online}
                onClick={() => {
                  setPage((p) => p + 1);
                  refresh();
                }}
              >
                Next page
              </button>
            </div>
          </>
        )
      )}
      {action?.kind === 'workload' && action.entity && (
        <Dialog title={`Workload · ${action.entity.name}`} onClose={() => setAction(undefined)}>
          <WorkloadView scope="team" id={action.entity.id} {...{ self, online, onFailure }} />
        </Dialog>
      )}
      {action &&
        action.kind !== 'tasks' &&
        action.kind !== 'workload' &&
        (action.kind === 'members' ? (
          <MembershipDialog
            key={action.entity!.id}
            {...{ self, online, onFailure }}
            entity={action.entity!}
            onClose={() => {
              setAction(undefined);
              refresh();
              onSelfChange();
            }}
          />
        ) : (
          <EntityDialog
            {...{ kind, self, online, onFailure }}
            action={action}
            onClose={() => setAction(undefined)}
            onDone={() => {
              setAction(undefined);
              setNotice('Saved');
              refresh();
              onSelfChange();
            }}
          />
        ))}
    </div>
  );
}

/** Team cards share one details route, including cards reached from Admin. */
function TeamDetails({
  id,
  self,
  online,
  onFailure,
  onSelfChange,
  onClose,
}: Props & { id: number; onClose: () => void }) {
  const location = useLocation(),
    navigate = useNavigate();
  const [team, setTeam] = useState<Team>(),
    [error, setError] = useState(''),
    [reload, setReload] = useState(0),
    [action, setAction] = useState<Action>();
  const read = useCallback(
    async (signal: AbortSignal) => {
      try {
        const current = await latest('teams', id, signal);
        if (!signal.aborted && !isProject(current)) {
          setTeam(current);
          setError('');
        }
      } catch (e) {
        if (!signal.aborted) {
          setTeam(undefined);
          setAction(undefined);
          setError(failureMessage(e));
          if (e instanceof ApiError) onFailure(e);
        }
      }
    },
    [id, onFailure],
  );
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (!controller.signal.aborted) return read(controller.signal);
    });
    return () => controller.abort();
  }, [read, reload, self.view_revision]);
  useSharedRefresh(read, online, id);
  const canWorkload =
    !!team &&
    (self.user.org_role === 'admin' ||
      team.own_role === 'lead' ||
      (!!team.own_role && self.user.permission_keys.includes('P-09')));
  const requested = new URLSearchParams(location.search).get('tab');
  const tab =
    requested === 'members'
      ? 'members'
      : requested === 'workload' && canWorkload
        ? 'workload'
        : 'info';
  const tabs = [
    { key: 'info', label: 'Team info' },
    { key: 'members', label: 'Members' },
    { key: 'workload', label: 'Workload' },
  ];
  const selectTab = (key: string) => navigate(`/teams?team=${id}&tab=${key}`, { replace: true });
  const changed = () => {
    setReload((n) => n + 1);
    onSelfChange();
  };
  const members = self.user.org_role === 'admin' ? (team?.members ?? []) : [];
  const membersVisible = self.user.org_role === 'admin' && team?.members !== undefined;
  return (
    <section className="team-details" aria-label="Team details">
      <button className="team-back" onClick={onClose}>
        ← Back to teams
      </button>
      {error && <p role="alert">{error}</p>}
      {!team ? (
        !error && <Loading />
      ) : (
        <>
          <header className="team-details-header">
            <span className="team-card-icon" aria-hidden="true">
              {team.name.trim()[0]?.toUpperCase()}
            </span>
            <div>
              <h1>{team.name}</h1>
              <p>
                {membersVisible && `${members.length} members · `}
                {team.archived_at ? 'Archived · Read only' : 'Active team'}
              </p>
            </div>
            <button onClick={() => setReload((n) => n + 1)} disabled={!online}>
              Refresh team
            </button>
          </header>
          <div className="team-tabs" role="tablist" aria-label="Team sections">
            {tabs.map((t) => (
              <button
                key={t.key}
                id={`team-tab-${t.key}`}
                role="tab"
                aria-controls={`team-panel-${t.key}`}
                aria-selected={tab === t.key}
                tabIndex={tab === t.key ? 0 : -1}
                disabled={t.key === 'workload' && !canWorkload}
                onClick={() => selectTab(t.key)}
                onKeyDown={(event) => {
                  if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
                  event.preventDefault();
                  const enabled = tabs.filter((t) => t.key !== 'workload' || canWorkload);
                  const index = enabled.findIndex((item) => item.key === tab);
                  const next =
                    event.key === 'Home'
                      ? enabled[0]
                      : event.key === 'End'
                        ? enabled[enabled.length - 1]
                        : enabled[
                            (index + (event.key === 'ArrowRight' ? 1 : enabled.length - 1)) %
                              enabled.length
                          ];
                  if (!next) return;
                  selectTab(next.key);
                  document.getElementById(`team-tab-${next.key}`)?.focus({ preventScroll: true });
                }}
              >
                {t.label}
                {t.key === 'members' && <span className="team-tab-count">{members.length}</span>}
              </button>
            ))}
          </div>
          {!canWorkload && (
            <p className="team-access-hint">Workload requires Admin, team Lead access, or P-09.</p>
          )}
          <section
            id="team-panel-info"
            role="tabpanel"
            aria-labelledby="team-tab-info"
            hidden={tab !== 'info'}
            tabIndex={0}
          >
            <div className="team-info-grid">
              <section className="team-info-card">
                <div className="team-section-heading">
                  <h2>Team info</h2>
                  {self.user.org_role === 'admin' && (
                    <button
                      className="primary"
                      disabled={!online || self.maintenance || !!team.archived_at}
                      onClick={() => setAction({ kind: 'edit', entity: team })}
                    >
                      Edit team info
                    </button>
                  )}
                </div>
                <dl>
                  <dt>Team Name</dt>
                  <dd>{team.name}</dd>
                  <dt>Team Description</dt>
                  <dd className="team-description">{team.description || 'No description yet'}</dd>
                  <dt>Status</dt>
                  <dd>
                    <span className={`team-state ${team.archived_at ? 'archived' : ''}`}>
                      {team.archived_at ? 'Archived' : 'Active'}
                    </span>
                  </dd>
                </dl>
              </section>
              <aside className="team-info-card">
                <h2>Team summary</h2>
                <dl>
                  <dt>Members</dt>
                  <dd>{membersVisible ? members.length : 'Admin only'}</dd>
                  <dt>Team positions</dt>
                  <dd className="team-position-summary">
                    {!membersVisible
                      ? 'Admin only'
                      : ['pm', 'lead', 'dev'].map((position) => (
                          <span key={position}>
                            {position === 'pm' ? 'PM' : position === 'lead' ? 'Lead' : 'Dev'}{' '}
                            <strong>
                              {members.filter((m) => m.team_position === position).length}
                            </strong>
                          </span>
                        ))}
                  </dd>
                  <dt>Lead access</dt>
                  <dd>
                    {members
                      .filter((m) => m.team_role === 'lead')
                      .map((m) => m.user.display_name)
                      .join(', ') || (membersVisible ? 'No team Lead assigned' : 'Admin only')}
                  </dd>
                </dl>
                <p className="team-access-hint">
                  PM / Lead / Dev describe responsibilities. Lead access is managed in Members.
                </p>
                {self.user.org_role === 'admin' && (
                  <button
                    className={team.archived_at ? 'primary' : 'danger'}
                    disabled={!online || self.maintenance}
                    onClick={() => setAction({ kind: 'archive', entity: team })}
                  >
                    {team.archived_at ? 'Unarchive' : 'Archive'}
                  </button>
                )}
              </aside>
            </div>
          </section>
          <section
            id="team-panel-members"
            role="tabpanel"
            aria-labelledby="team-tab-members"
            hidden={tab !== 'members'}
            tabIndex={0}
          >
            <MembershipDialog
              embedded
              entity={team}
              {...{ self, online, onFailure }}
              onClose={onClose}
              onChanged={changed}
            />
          </section>
          <section
            id="team-panel-workload"
            role="tabpanel"
            aria-labelledby="team-tab-workload"
            hidden={tab !== 'workload'}
            tabIndex={0}
          >
            {tab === 'workload' && canWorkload && (
              <WorkloadView scope="team" id={id} {...{ self, online, onFailure }} />
            )}
          </section>
          {action && self.user.org_role === 'admin' && (
            <EntityDialog
              kind="teams"
              action={action}
              {...{ self, online, onFailure }}
              onClose={() => setAction(undefined)}
              onDone={() => {
                setAction(undefined);
                changed();
              }}
            />
          )}
        </>
      )}
    </section>
  );
}
function MembershipFrame({
  embedded,
  title,
  onClose,
  children,
}: {
  embedded: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return embedded ? (
    <div className="team-members-grid">{children}</div>
  ) : (
    <Dialog
      title={title}
      onClose={onClose}
      className={title.startsWith('Members ') ? 'project-members-dialog' : 'team-member-editor'}
    >
      {children}
    </Dialog>
  );
}

async function latest(kind: 'teams' | 'projects', id: number, signal?: AbortSignal) {
  for (let p = 1; ; p++) {
    const result = await client.request(
      `/api/${kind}?includeArchived=true&pageSize=100&page=${p}`,
      { signal, parse: (v) => parsePage(kind, v) },
    );
    const item = result.items.find((e) => e.id === id);
    if (item) return item;
    if (p * result.pageSize >= result.total) throw new ApiError('not-found', 404);
  }
}
function EntityDialog({
  kind,
  self,
  online,
  onFailure,
  action,
  onClose,
  onDone,
}: Omit<Props, 'onSelfChange'> & {
  kind: 'teams' | 'projects';
  action: Action;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(action.entity?.name ?? ''),
    [description, setDescription] = useState(action.entity?.description ?? ''),
    [projectType, setProjectType] = useState<string>(
      action.entity && isProject(action.entity) ? action.entity.project_type : 'internal',
    ),
    [projectCategory, setProjectCategory] = useState<string>(
      action.entity && isProject(action.entity) ? action.entity.project_category : 'development',
    ),
    [entity, setEntity] = useState(action.entity),
    [teams, setTeams] = useState<Team[]>([]),
    [team, setTeam] = useState(''),
    [initialMembers, setInitialMembers] = useState<InitialTeamMember[]>([]),
    [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [conflict, setConflict] = useState(false),
    [review, setReview] = useState(false),
    [showReview, setShowReview] = useState(false),
    [unknown, setUnknown] = useState(false),
    [key] = useState(() => crypto.randomUUID());
  useEffect(() => {
    if (kind !== 'projects' || action.kind !== 'create') return;
    const controller = new AbortController();
    void (async () => {
      const all: Team[] = [];
      for (let p = 1; ; p++) {
        const v = await client.request(`/api/teams?pageSize=100&page=${p}`, {
          parse: (x) => teamPage.parse(x),
          signal: controller.signal,
        });
        all.push(...v.items.filter((t) => self.user.org_role === 'admin' || t.own_role === 'lead'));
        if (p * v.pageSize >= v.total) break;
      }
      if (!controller.signal.aborted) setTeams(all);
    })().catch((e: unknown) => {
      if (!controller.signal.aborted) {
        setError(failureMessage(e));
        if (e instanceof ApiError) onFailure(e);
      }
    });
    return () => controller.abort();
  }, [kind, action.kind, self.user.org_role, onFailure]);
  const load = async () => {
    if (!entity) return;
    setPending(true);
    try {
      setEntity(await latest(kind, entity.id));
      setConflict(false);
      setReview(true);
      setShowReview(true);
      setError('Latest data loaded. Review your draft and the current data before confirming.');
    } catch (e) {
      setError(failureMessage(e));
      if (e instanceof ApiError) onFailure(e);
    } finally {
      setPending(false);
    }
  };
  const submit = async () => {
    if (review || conflict) return;
    setPending(true);
    setError('');
    try {
      const create = action.kind === 'create',
        archive = action.kind === 'archive';
      const value = archive
        ? { archived: !entity!.archived_at, version: entity!.version }
        : {
            name: name.trim(),
            description,
            ...(kind === 'teams' && create ? { members: initialMembers } : {}),
            ...(kind === 'projects'
              ? { project_type: projectType, project_category: projectCategory }
              : {}),
            ...(!create
              ? { version: entity!.version }
              : kind === 'projects'
                ? { owner_team_id: Number(team) }
                : {}),
          };
      if (!archive) {
        if (
          !name.trim() ||
          name.trim().length > 100 ||
          description.length > (kind === 'teams' ? 1000 : 2000) ||
          (create && kind === 'projects' && !team)
        )
          throw new Error('Enter a valid name, team and description');
      }
      await client.request(`/api/${kind}${create ? '' : '/' + entity!.id}`, {
        method: create ? 'POST' : 'PATCH',
        body: value,
        csrf: self.csrf,
        ...(create ? { key } : {}),
        parse: (v) => parseItem(kind, v),
      });
      onDone();
    } catch (e) {
      setError(failureMessage(e));
      if (e instanceof ApiError) {
        if (e.kind === 'conflict') setConflict(true);
        if (e.status === 0 || e.kind === 'unavailable') {
          setUnknown(true);
          if (action.kind !== 'create') setConflict(true);
        }
        onFailure(e);
      }
    } finally {
      setPending(false);
    }
  };
  return (
    <Dialog
      className={action.kind !== 'archive' ? 'project-details-dialog' : 'project-action-dialog'}
      title={
        action.kind === 'create'
          ? `Create ${kind === 'teams' ? 'team' : 'project'}`
          : action.kind === 'archive'
            ? entity?.archived_at
              ? 'Unarchive'
              : 'Archive'
            : `Edit ${entity?.name}`
      }
      onClose={() => {
        if (!pending) onClose();
      }}
    >
      {error && <p role="alert">{error}</p>}
      {unknown && (
        <p>
          Result is unconfirmed. Check the latest list before retrying. Creation uses the same
          request ID.
        </p>
      )}
      {conflict && (
        <button disabled={pending || !online} onClick={() => void load()}>
          Load latest and review
        </button>
      )}
      {showReview && (
        <div>
          <p>
            Latest data: {entity?.name} · {entity?.description} ·{' '}
            {entity && isProject(entity) && (
              <>
                Type: {entity.project_type || 'Not selected'} · Category:{' '}
                {entity.project_category || 'Not selected'} ·{' '}
              </>
            )}
            {entity?.archived_at ? 'Archived' : 'Active'}
          </p>
          <label>
            <input
              type="checkbox"
              checked={!review}
              onChange={(e) => setReview(!e.target.checked)}
            />{' '}
            I have reviewed the latest data and my draft
          </label>
        </div>
      )}
      <Form
        pending={pending}
        blocked={self.maintenance || conflict || review}
        offline={!online}
        submitLabel={action.kind === 'archive' ? 'Confirm' : 'Save'}
        onSubmit={() => void submit()}
      >
        {action.kind === 'archive' ? (
          <p>
            Confirm{entity?.archived_at ? 'Unarchive' : 'Archive'} “{entity?.name}”
            {kind === 'teams'
              ? ' A team can be archived only when it has no active projects'
              : ' Archived projects remain readable but cannot be edited'}
          </p>
        ) : (
          <>
            <Field
              label={kind === 'projects' ? 'Project Name' : 'Team Name'}
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
              required
              data-autofocus
            />
            {kind === 'projects' && (
              <div className="project-classification-fields">
                <label>
                  Project Type
                  <select value={projectType} onChange={(e) => setProjectType(e.target.value)}>
                    {projectTypes.map((value) => (
                      <option key={value} value={value}>
                        {value ? value[0]!.toUpperCase() + value.slice(1) : 'Choose type'}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Project Category
                  <select
                    value={projectCategory}
                    onChange={(e) => setProjectCategory(e.target.value)}
                  >
                    {projectCategories.map((value) => (
                      <option key={value} value={value}>
                        {value
                          ? ['it', 'hr'].includes(value)
                            ? value.toUpperCase()
                            : value[0]!.toUpperCase() + value.slice(1)
                          : 'Choose category'}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            <label className="project-detail-field">
              {kind === 'projects' ? 'Project Detail' : 'Team Description'}
              <textarea
                rows={4}
                value={description}
                maxLength={kind === 'teams' ? 1000 : 2000}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            {kind === 'teams' && action.kind === 'create' && (
              <InitialTeamMembers value={initialMembers} onChange={setInitialMembers} />
            )}
            {kind === 'teams' && action.kind === 'edit' && (
              <p className="hint">
                Use the team's Members tab to add members or update their PM / Lead / Dev position.
              </p>
            )}
            {kind === 'projects' && action.kind === 'create' && (
              <label className="project-owner-field">
                Owner team
                <select
                  aria-label="Owner team"
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  required
                >
                  <option value="">Choose team</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {kind === 'projects' && action.kind === 'edit' && (
              <p>
                Owner team: {isProject(entity!) ? entity!.owner_team_name : ''} · Owner team cannot
                change
              </p>
            )}
          </>
        )}
        <button type="button" className="permission-cancel" disabled={pending} onClick={onClose}>
          Cancel
        </button>
      </Form>
    </Dialog>
  );
}

type Member = {
  user: { id: number; display_name: string; active: boolean };
  jobTitle?: string | null;
  teamPosition?: string;
  explicit: string | null;
  effective: string;
};
function MembershipDialog({
  self,
  online,
  onFailure,
  entity: initial,
  onClose,
  embedded = false,
  onChanged,
}: Omit<Props, 'onSelfChange'> & {
  entity: Entity;
  onClose: () => void;
  embedded?: boolean;
  onChanged?: () => void;
}) {
  const kind = isProject(initial) ? 'projects' : 'teams';
  const [entity, setEntity] = useState(initial),
    [members, setMembers] = useState<Member[]>([]),
    [version, setVersion] = useState(initial.version),
    [directory, setDirectory] = useState<z.infer<typeof directoryPage>>(),
    [page, setPage] = useState(1),
    [query, setQuery] = useState(''),
    [search, setSearch] = useState(''),
    [directoryReload, setDirectoryReload] = useState(0),
    [selected, setSelected] = useState<{ id: number; name: string }>(),
    [role, setRole] = useState(kind === 'teams' ? 'member' : 'viewer'),
    [position, setPosition] = useState('dev'),
    [pending, setPending] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [reload, setReload] = useState(0),
    [conflict, setConflict] = useState(false),
    [confirm, setConfirm] = useState<{
      id: number;
      name: string;
      remove: boolean;
      role: string;
      position?: string;
    }>(),
    [notice, setNotice] = useState(''),
    [revoked, setRevoked] = useState(false),
    [editor, setEditor] = useState<'add' | 'edit'>();
  // FR-42: a P-03 manager edits Editor/Viewer only; manager appointment stays Admin/Lead.
  const leadOrAdmin = !revoked && manage(entity, self);
  const managerP03 =
    !revoked &&
    isProject(entity) &&
    entity.effective_access === 'manager' &&
    self.user.permission_keys.includes('P-03');
  const canManage = !initial.archived_at && !entity.archived_at && (leadOrAdmin || managerP03);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      if (kind === 'projects') {
        const current = await latest('projects', initial.id);
        if (!controller.signal.aborted) setEntity(current);
        const v = await client.request(`/api/projects/${initial.id}/members`, {
          signal: controller.signal,
          parse: (x) => projectMembers.parse(x),
        });
        if (!controller.signal.aborted) {
          setMembers(
            v.items.map((m) => ({
              user: m.user,
              jobTitle: m.job_title,
              explicit: m.explicit_access,
              effective: m.effective_access,
            })),
          );
          setVersion(v.membership_version);
        }
      } else {
        const current = await latest('teams', initial.id);
        if (!controller.signal.aborted && !isProject(current)) {
          setEntity(current);
          setVersion(current.version);
          setMembers(
            current.members?.map((m) => ({
              user: m.user,
              explicit: m.team_role,
              effective: m.team_role,
              teamPosition: m.team_position,
            })) ?? [],
          );
        }
      }
      if (!controller.signal.aborted) setLoading(false);
    })().catch((e: unknown) => {
      if (!controller.signal.aborted) {
        setMembers([]);
        setDirectory(undefined);
        setSelected(undefined);
        setConfirm(undefined);
        setRevoked(true);
        setLoading(false);
        setError(failureMessage(e));
        if (e instanceof ApiError) onFailure(e);
      }
    });
    return () => controller.abort();
  }, [initial.id, kind, reload, self.view_revision, onFailure]);
  useEffect(() => {
    if (!canManage) return;
    const controller = new AbortController();
    void client
      .request(`/api/directory?page=${page}&pageSize=10&q=${encodeURIComponent(search)}`, {
        signal: controller.signal,
        parse: (x) => directoryPage.parse(x),
      })
      .then((v) => {
        if (!controller.signal.aborted) setDirectory(v);
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) {
          setDirectory(undefined);
          setError(failureMessage(e));
          if (e instanceof ApiError) onFailure(e);
        }
      });
    return () => controller.abort();
  }, [canManage, page, search, directoryReload, onFailure]);
  const change = async () => {
    if (!confirm || conflict) return;
    setPending(true);
    setError('');
    try {
      await client.request(`/api/${kind}/${entity.id}/members/${confirm.id}`, {
        method: confirm.remove ? 'DELETE' : 'PUT',
        body: confirm.remove
          ? { version }
          : {
              version,
              ...(kind === 'teams'
                ? {
                    team_role: confirm.role,
                    ...(confirm.position ? { team_position: confirm.position } : {}),
                  }
                : { access: confirm.role }),
            },
        csrf: self.csrf,
        parse: (v) => (kind === 'projects' ? projectMembers.parse(v) : parseItem('teams', v)),
      });
      setConfirm(undefined);
      setEditor(undefined);
      onChanged?.();
      setNotice('Members saved');
      setSelected(undefined);
      setLoading(true);
      setReload((n) => n + 1);
    } catch (e) {
      setError(failureMessage(e));
      if (e instanceof ApiError) {
        if (e.kind === 'conflict' || e.status === 0 || e.kind === 'unavailable') {
          setConflict(true);
          setEditor(undefined);
          setConfirm(undefined);
        }
        onFailure(e);
      }
    } finally {
      setPending(false);
    }
  };
  if (
    kind === 'teams' &&
    (self.user.org_role !== 'admin' || (!isProject(initial) && initial.members === undefined))
  )
    return (
      <p className="team-access-hint">Team member details are available to administrators only.</p>
    );
  return (
    <MembershipFrame
      embedded={embedded}
      title={revoked ? 'Member data not found' : `Members ${entity.name}`}
      onClose={() => {
        if (!pending) onClose();
      }}
    >
      {entity.archived_at && <p>Archived project or team · Read only</p>}
      {!canManage && !entity.archived_at && (
        <p>
          {kind === 'teams'
            ? 'Only an administrator can manage team members.'
            : 'Only an administrator, owner team lead or permitted project manager can change access.'}
        </p>
      )}
      {kind === 'teams' && (
        <div className="team-members-toolbar">
          <div>
            <h2>Members</h2>
            <p>{members.length} people · Positions and access are managed separately.</p>
          </div>
          <div className="row-actions">
            <button
              disabled={!online || pending || !!editor || !!confirm}
              onClick={() => {
                setLoading(true);
                setReload((n) => n + 1);
              }}
            >
              Refresh members
            </button>
            {canManage && (
              <button
                className="primary"
                disabled={!online || pending || loading || conflict || self.maintenance}
                onClick={() => {
                  setSelected(undefined);
                  setRole('member');
                  setPosition('dev');
                  setEditor('add');
                }}
              >
                Add member
              </button>
            )}
          </div>
        </div>
      )}
      {notice && <Toast>{notice}</Toast>}
      {error && <p role="alert">{error}</p>}
      {conflict && (
        <div>
          <p>Data changed or result is unconfirmed. Refresh and choose the action again.</p>
          <button
            disabled={!online || pending}
            onClick={() => {
              setConflict(false);
              setConfirm(undefined);
              setSelected(undefined);
              setLoading(true);
              setReload((n) => n + 1);
            }}
          >
            Refresh members
          </button>
        </div>
      )}
      {loading ? (
        <Loading />
      ) : (
        <DataTable
          caption="Members"
          className={kind === 'teams' ? 'team-member-table' : undefined}
          columns={[
            'Name',
            'Account status',
            ...(kind === 'teams' ? ['Position'] : []),
            ...(kind === 'teams' ? ['Team access'] : ['Explicit access', 'Effective access']),
            'Manage',
          ]}
          rows={members.map((m) => [
            m.jobTitle ? `${m.user.display_name} · ${m.jobTitle}` : m.user.display_name,
            m.user.active ? 'Active' : 'Inactive',
            ...(kind === 'teams'
              ? [m.teamPosition === 'pm' ? 'PM' : m.teamPosition === 'lead' ? 'Lead' : 'Dev']
              : []),
            ...(kind === 'teams'
              ? [m.explicit === 'lead' ? 'Lead' : 'Member']
              : [m.explicit ?? 'None', m.effective]),
            <div className="row-actions" key={m.user.id}>
              {kind === 'teams' && canManage && (
                <details className="team-member-menu">
                  <summary aria-label={`More actions for ${m.user.display_name}`}>•••</summary>
                  <button
                    className="danger"
                    disabled={!online || pending || conflict || self.maintenance}
                    onClick={() =>
                      setConfirm({
                        id: m.user.id,
                        name: m.user.display_name,
                        remove: true,
                        role: m.explicit!,
                      })
                    }
                  >
                    Remove member
                  </button>
                </details>
              )}
              {kind === 'teams' && canManage && (
                <button
                  disabled={!online || pending || conflict || self.maintenance}
                  onClick={() => {
                    setSelected({ id: m.user.id, name: m.user.display_name });
                    setRole(m.explicit ?? 'member');
                    setPosition(m.teamPosition ?? 'dev');
                    setEditor('edit');
                  }}
                >
                  Edit member
                </button>
              )}
              {kind === 'projects' &&
                canManage &&
                m.explicit &&
                (leadOrAdmin || m.explicit !== 'manager') && (
                  <>
                    <button
                      disabled={!online || pending || conflict || self.maintenance}
                      onClick={() =>
                        setConfirm({
                          id: m.user.id,
                          name: m.user.display_name,
                          remove: false,
                          role: m.explicit === 'editor' ? 'viewer' : 'editor',
                          position: m.teamPosition,
                        })
                      }
                    >
                      {m.explicit === 'editor' ? 'Change to Viewer' : 'Change to Editor'}
                    </button>
                    <button
                      disabled={!online || pending || conflict || self.maintenance}
                      onClick={() =>
                        setConfirm({
                          id: m.user.id,
                          name: m.user.display_name,
                          remove: true,
                          role: m.explicit!,
                        })
                      }
                    >
                      Remove member
                    </button>
                  </>
                )}
            </div>,
          ])}
        />
      )}
      {canManage && (kind === 'projects' || editor) && (
        <MembershipFrame
          embedded={kind === 'projects'}
          title={editor === 'edit' ? `Edit member · ${selected?.name}` : 'Add member'}
          onClose={() => !pending && setEditor(undefined)}
        >
          {kind === 'projects' && <h3>Add or update member</h3>}
          {kind === 'teams' && (
            <p className="member-editor-intro">
              Position is a team responsibility. Team access controls Lead permissions.
            </p>
          )}
          {(kind === 'projects' || editor === 'add') && (
            <>
              <form
                className="toolbar"
                onSubmit={(e) => {
                  e.preventDefault();
                  setDirectory(undefined);
                  setSearch(query);
                  setPage(1);
                  setDirectoryReload((n) => n + 1);
                }}
              >
                <Field
                  label="Search active users"
                  placeholder="Name or username"
                  value={query}
                  maxLength={100}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button disabled={!online}>Search</button>
              </form>
              {kind === 'teams' && !directory && (
                <label>
                  Users
                  <select aria-label="Users" disabled value="">
                    <option value="">
                      {error ? 'Users unavailable — try Search' : 'Loading users…'}
                    </option>
                  </select>
                </label>
              )}
              {directory && (
                <>
                  <label>
                    Users
                    <select
                      aria-label="Users"
                      disabled={!online || !directory.items.length}
                      value={
                        selected && directory.items.some((u) => u.id === selected.id)
                          ? selected.id
                          : ''
                      }
                      onChange={(e) => {
                        const u = directory.items.find((x) => x.id === Number(e.target.value));
                        setSelected(u ? { id: u.id, name: u.display_name } : undefined);
                        if (kind === 'teams') {
                          const existing = members.find((m) => m.user.id === u?.id);
                          setRole(existing?.explicit ?? 'member');
                          setPosition(existing?.teamPosition ?? 'dev');
                        }
                      }}
                    >
                      <option value="">
                        {directory.items.length ? 'Choose user' : 'No active users found'}
                      </option>
                      {directory.items.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.display_name} · {u.teams.map((t) => t.name).join(', ') || 'No team'}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="toolbar">
                    <button
                      disabled={page === 1 || !online}
                      onClick={() => {
                        setDirectory(undefined);
                        setPage((n) => n - 1);
                      }}
                    >
                      Previous users page
                    </button>
                    <span>
                      Page {page} · {directory.total} people
                    </span>
                    <button
                      disabled={page * directory.pageSize >= directory.total || !online}
                      onClick={() => {
                        setDirectory(undefined);
                        setPage((n) => n + 1);
                      }}
                    >
                      Next users page
                    </button>
                  </div>
                </>
              )}
            </>
          )}
          {selected && (
            <p className={kind === 'teams' ? 'member-editor-selected' : undefined}>
              Selected: {selected.name}
            </p>
          )}
          {kind === 'teams' && (
            <label>
              Team Position
              <select value={position} onChange={(e) => setPosition(e.target.value)}>
                <option value="pm">PM</option>
                <option value="lead">Lead</option>
                <option value="dev">Dev</option>
              </select>
            </label>
          )}
          <label>
            {kind === 'teams' ? 'Team access' : 'Role'}
            <select
              aria-label={kind === 'teams' ? 'Team access' : 'Role'}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {(kind === 'teams'
                ? ['member', 'lead']
                : leadOrAdmin
                  ? ['viewer', 'editor', 'manager']
                  : ['viewer', 'editor']
              ).map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <button
            disabled={!selected || !online || pending || loading || conflict || self.maintenance}
            className="primary"
            onClick={() => {
              if (selected) {
                setConfirm({ ...selected, remove: false, role, position });
                setEditor(undefined);
              }
            }}
          >
            {kind === 'teams' ? 'Review & Save' : 'Set membership'}
          </button>
          {kind === 'teams' && (
            <button
              className="permission-cancel"
              disabled={pending}
              onClick={() => setEditor(undefined)}
            >
              Cancel
            </button>
          )}
        </MembershipFrame>
      )}
      {confirm && (
        <MembershipFrame
          embedded={kind === 'projects'}
          title={confirm.remove ? 'Remove member' : 'Review member changes'}
          onClose={() => !pending && setConfirm(undefined)}
        >
          <div className="membership-confirm">
            <p>
              Confirm {confirm.remove ? 'Remove member' : `Set ${confirm.role}`} for {confirm.name}
              {kind === 'teams' &&
                !confirm.remove &&
                ` · Position: ${confirm.position === 'pm' ? 'PM' : (confirm.position ?? 'unchanged')}`}
            </p>
            <p>
              Loss of write access removes assignments from open tasks. Completed tasks retain
              history. Explicit project access survives team membership removal.
            </p>
            <button
              disabled={pending || !online || conflict || self.maintenance}
              onClick={() => void change()}
              className={confirm.remove ? 'danger' : 'primary'}
            >
              {kind === 'teams'
                ? confirm.remove
                  ? 'Remove member'
                  : 'Save'
                : 'Confirm access change'}
            </button>
            <button
              className="permission-cancel"
              disabled={pending}
              onClick={() => setConfirm(undefined)}
            >
              {kind === 'teams' ? 'Cancel' : 'Cancel action'}
            </button>
          </div>
        </MembershipFrame>
      )}
    </MembershipFrame>
  );
}
