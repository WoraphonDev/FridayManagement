import { useLocation, useNavigate } from 'react-router-dom';
import { useSharedRefresh } from './shared/refresh';
import { ProjectTasks } from './ProjectTasks';
import { useEffect, useState } from 'react';
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
        {...{ self, online, onFailure }}
        onClose={() => {
          setAction(undefined);
          navigate('/projects');
        }}
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
                                  setAction({ kind: 'tasks', entity: e });
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
                    <article key={e.id} className={`team-card ${e.archived_at ? 'archived' : ''}`}>
                      <div className="team-card-head">
                        <span className="team-card-icon" aria-hidden="true">
                          {e.name.trim()[0]?.toUpperCase()}
                        </span>
                        <span className={`team-state ${e.archived_at ? 'archived' : ''}`}>
                          {e.archived_at ? 'Archived · Read only' : 'Active'}
                        </span>
                      </div>
                      <h3>{e.name}</h3>
                      <p>{e.description}</p>
                      <div className="team-card-meta">
                        <span>
                          Lead · {leads.map((m) => m.user.display_name).join(', ') || '—'}
                        </span>
                        <span>{members.length} Members</span>
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
                        <details className="card-menu">
                          <summary aria-label={`Team actions ${e.name}`}>•••</summary>
                          {actionsFor(e)}
                        </details>
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

async function latest(kind: 'teams' | 'projects', id: number) {
  for (let p = 1; ; p++) {
    const result = await client.request(
      `/api/${kind}?includeArchived=true&pageSize=100&page=${p}`,
      { parse: (v) => parsePage(kind, v) },
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
    [entity, setEntity] = useState(action.entity),
    [teams, setTeams] = useState<Team[]>([]),
    [team, setTeam] = useState(''),
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
      title={
        action.kind === 'create'
          ? `Create${kind === 'teams' ? 'Teams' : 'Projects'}`
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
              label="Name"
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <label>
              Details
              <textarea
                value={description}
                maxLength={kind === 'teams' ? 1000 : 2000}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            {kind === 'projects' && action.kind === 'create' && (
              <label>
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
      </Form>
    </Dialog>
  );
}

type Member = {
  user: { id: number; display_name: string; active: boolean };
  jobTitle?: string | null;
  explicit: string | null;
  effective: string;
};
function MembershipDialog({
  self,
  online,
  onFailure,
  entity: initial,
  onClose,
}: Omit<Props, 'onSelfChange'> & { entity: Entity; onClose: () => void }) {
  const kind = isProject(initial) ? 'projects' : 'teams';
  const [entity, setEntity] = useState(initial),
    [members, setMembers] = useState<Member[]>([]),
    [version, setVersion] = useState(initial.version),
    [directory, setDirectory] = useState<z.infer<typeof directoryPage>>(),
    [page, setPage] = useState(1),
    [query, setQuery] = useState(''),
    [search, setSearch] = useState(''),
    [selected, setSelected] = useState<{ id: number; name: string }>(),
    [role, setRole] = useState(kind === 'teams' ? 'member' : 'viewer'),
    [pending, setPending] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [reload, setReload] = useState(0),
    [conflict, setConflict] = useState(false),
    [confirm, setConfirm] = useState<{ id: number; name: string; remove: boolean; role: string }>(),
    [notice, setNotice] = useState(''),
    [revoked, setRevoked] = useState(false);
  // FR-42: a P-03 manager edits Editor/Viewer only; manager appointment stays Admin/Lead.
  const leadOrAdmin = !revoked && manage(entity, self);
  const managerP03 =
    !revoked &&
    isProject(entity) &&
    entity.effective_access === 'manager' &&
    self.user.permission_keys.includes('P-03');
  const canManage = leadOrAdmin || managerP03;
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
  }, [canManage, page, search, onFailure]);
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
              ...(kind === 'teams' ? { team_role: confirm.role } : { access: confirm.role }),
            },
        csrf: self.csrf,
        parse: (v) => (kind === 'projects' ? projectMembers.parse(v) : parseItem('teams', v)),
      });
      setConfirm(undefined);
      setNotice('Members saved');
      setSelected(undefined);
      setLoading(true);
      setReload((n) => n + 1);
    } catch (e) {
      setError(failureMessage(e));
      if (e instanceof ApiError) {
        if (e.kind === 'conflict' || e.status === 0 || e.kind === 'unavailable') {
          setConflict(true);
          setConfirm(undefined);
        }
        onFailure(e);
      }
    } finally {
      setPending(false);
    }
  };
  return (
    <Dialog
      title={revoked ? 'Member data not found' : `Members ${entity.name}`}
      onClose={() => {
        if (!pending) onClose();
      }}
    >
      {entity.archived_at && <p>Archived project or team · Read only</p>}
      {!canManage && <p>Only an administrator or owner team lead can change access</p>}
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
          columns={['Name', 'Account status', 'Explicit access', 'Effective access', 'Manage']}
          rows={members.map((m) => [
            m.jobTitle ? `${m.user.display_name} · ${m.jobTitle}` : m.user.display_name,
            m.user.active ? 'Activate' : 'Deactivate',
            m.explicit ?? 'None',
            m.effective,
            <div className="row-actions" key={m.user.id}>
              {canManage && m.explicit && (leadOrAdmin || m.explicit !== 'manager') && (
                <>
                  <button
                    disabled={!online || pending || conflict || self.maintenance}
                    onClick={() =>
                      setConfirm({
                        id: m.user.id,
                        name: m.user.display_name,
                        remove: false,
                        role:
                          kind === 'teams'
                            ? m.explicit === 'lead'
                              ? 'member'
                              : 'lead'
                            : m.explicit === 'editor'
                              ? 'viewer'
                              : 'editor',
                      })
                    }
                  >
                    {kind === 'teams'
                      ? m.explicit === 'lead'
                        ? 'Remove Lead role'
                        : 'Make Lead'
                      : m.explicit === 'editor'
                        ? 'Change to Viewer'
                        : 'Change to Editor'}
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
      {canManage && (
        <>
          <h3>Add or update member</h3>
          <form
            className="toolbar"
            onSubmit={(e) => {
              e.preventDefault();
              setDirectory(undefined);
              setSearch(query);
              setPage(1);
            }}
          >
            <Field
              label="Search active users"
              value={query}
              maxLength={100}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button disabled={!online}>Search</button>
          </form>
          {directory && (
            <>
              <label>
                Users
                <select
                  aria-label="Users"
                  value={
                    selected && directory.items.some((u) => u.id === selected.id) ? selected.id : ''
                  }
                  onChange={(e) => {
                    const u = directory.items.find((x) => x.id === Number(e.target.value));
                    setSelected(u ? { id: u.id, name: u.display_name } : undefined);
                  }}
                >
                  <option value="">Choose user</option>
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
          {selected && <p>Selected: {selected.name}</p>}
          <label>
            Role
            <select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
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
            onClick={() => selected && setConfirm({ ...selected, remove: false, role })}
          >
            Set membership
          </button>
        </>
      )}
      {confirm && (
        <div className="membership-confirm">
          <p>
            Confirm {confirm.remove ? 'Remove member' : `Set ${confirm.role}`} for {confirm.name}
          </p>
          <p>
            Loss of write access removes assignments from open tasks. Completed tasks retain
            history. Explicit project access survives team membership removal.
          </p>
          <button
            disabled={pending || !online || conflict || self.maintenance}
            onClick={() => void change()}
          >
            Confirm access change
          </button>
          <button disabled={pending} onClick={() => setConfirm(undefined)}>
            Cancel action
          </button>
        </div>
      )}
    </Dialog>
  );
}
