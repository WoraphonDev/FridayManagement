import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { apiClient, ApiError, type Self } from './api';
import {
  reportSchema,
  monthFilters,
  reportParameters,
  visibleProjects,
  type Report,
  type ReportFilters,
} from './report-api';
import type { Project } from './workspace-api';
import { statusLabel, statuses } from './task-api';
import { useSharedRefresh } from './shared/refresh';
import { Loading, ErrorNotice, EmptyState } from './shared/components';
import { loadJobTitles, type JobTitle } from './admin-api';
import { UiIcon } from './shared/UiIcon';
import { useCountUp } from './motion';
const client = apiClient(),
  basisLabels = { created: 'Created on', due: 'Due date', completed: 'Completed on' };
export function Reports({
  self,
  online,
  onFailure,
}: {
  self: Self;
  online: boolean;
  onFailure: (e: ApiError) => void;
}) {
  const [filters, setFilters] = useState<ReportFilters>(() => monthFilters()),
    [data, setData] = useState<Report>(),
    [projects, setProjects] = useState<Project[]>([]),
    [people, setPeople] = useState<NonNullable<Report['workload'][number]['assignee']>[]>([]),
    [titles, setTitles] = useState<JobTitle[]>([]),
    [error, setError] = useState<ApiError>(),
    [reload, setReload] = useState(0),
    [exporting, setExporting] = useState(false),
    [notice, setNotice] = useState('');
  const busy = useRef(false),
    download = useRef<AbortController | null>(null),
    query = reportParameters(filters);
  const read = useCallback(
    async (signal: AbortSignal) => {
      try {
        const r = await client.request(`/api/reports/summary?${query}`, {
          signal,
          parse: (v) => reportSchema.parse(v),
        });
        const p = await visibleProjects(signal);
        const t = await loadJobTitles(signal, true);
        const unfiltered = new URLSearchParams(query);
        unfiltered.delete('assignee');
        const choices = filters.assignee
          ? await client.request(`/api/reports/summary?${unfiltered}`, {
              signal,
              parse: (v) => reportSchema.parse(v),
            })
          : r;
        if (!signal.aborted) {
          setProjects(p);
          setTitles(t);
          setPeople(choices.workload.flatMap((w) => (w.assignee ? [w.assignee] : [])));
          setData(r);
          setError(undefined);
        }
      } catch (e) {
        if (!signal.aborted && e instanceof ApiError) {
          setData(undefined);
          setProjects([]);
          setPeople([]);
          setError(e);
          onFailure(e);
        }
      }
    },
    [query, filters.assignee, onFailure],
  );
  useEffect(() => {
    const c = new AbortController();
    if (online)
      void Promise.resolve().then(() => {
        if (!c.signal.aborted) return read(c.signal);
      });
    return () => c.abort();
  }, [read, reload, online]);
  useEffect(() => () => download.current?.abort(), []);
  useSharedRefresh(read, online, self.csrf + query);
  const change = (key: keyof ReportFilters, value: string) => {
    download.current?.abort();
    busy.current = false;
    setExporting(false);
    setData(undefined);
    setNotice('');
    setFilters((f) => ({
      ...f,
      [key]: value,
      ...(key === 'team'
        ? { project: '', assignee: '' }
        : key === 'project'
          ? { assignee: '' }
          : {}),
    }));
  };
  const exportCSV = async () => {
    if (busy.current || !data || !online) return;
    busy.current = true;
    setExporting(true);
    setNotice('');
    const c = new AbortController();
    download.current = c;
    const exported = new URLSearchParams(query);
    for (const key of ['date_basis', 'date_from', 'date_to'] as const) {
      const value = data.metadata[key];
      if (value !== null) exported.set(key, value);
    }
    try {
      const blob = await client.request(`/api/export/tasks.csv?${exported}`, {
        signal: c.signal,
        csv: true,
        parse: (v) => {
          if (!(v instanceof Blob)) throw new Error('blob');
          return v;
        },
      });
      if (!c.signal.aborted) {
        const url = URL.createObjectURL(blob),
          a = document.createElement('a');
        a.href = url;
        a.download = `friday-tasks-${data.metadata.date_basis}-${data.metadata.date_from ?? 'start'}-${data.metadata.date_to ?? 'end'}.csv`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setNotice('CSV downloaded using the current filters');
      }
    } catch (e) {
      if (!c.signal.aborted && e instanceof ApiError) {
        if (e.code === 'EXPORT_LIMIT_EXCEEDED')
          setNotice('Over 50,000 tasks. Narrow the date range or filters before exporting.');
        else setError(e);
        onFailure(e);
      }
    } finally {
      if (download.current === c) {
        busy.current = false;
        setExporting(false);
      }
    }
  };
  const teams = [...new Map(projects.map((p) => [p.owner_team_id, p.owner_team_name])).entries()];
  return (
    <div className="reports-workspace">
      <div className="report-filter-card" role="group" aria-label="Report filters">
        <div className="report-filter-heading">
          <div>
            <span className="report-heading-icon">
              <UiIcon name="filter" />
            </span>
            <div>
              <h2>Report filters</h2>
              <p>Choose a scope and period to explore your work</p>
            </div>
          </div>
          <button
            className="primary report-export"
            disabled={!online || !data || exporting}
            onClick={() => void exportCSV()}
          >
            <UiIcon name="download" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
        <div className="report-toolbar">
          <label>
            Owner team
            <select
              aria-label="Owner team"
              value={filters.team}
              onChange={(e) => change('team', e.target.value)}
            >
              <option value="">All accessible teams</option>
              {teams.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Projects
            <select
              aria-label="Projects"
              value={filters.project}
              onChange={(e) => change('project', e.target.value)}
            >
              <option value="">All accessible projects</option>
              {projects
                .filter((p) => !filters.team || p.owner_team_id === Number(filters.team))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Assignee
            <select
              aria-label="Assignee"
              value={filters.assignee}
              onChange={(e) => change('assignee', e.target.value)}
            >
              <option value="">Everyone</option>
              <option value="null">Unassigned</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name}
                  {!p.active ? ' (Inactive)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            Job title
            <select
              aria-label="Job title"
              value={filters.job_title}
              onChange={(e) => change('job_title', e.target.value)}
            >
              <option value="">All titles</option>
              {titles.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {!t.is_active ? ' (Inactive)' : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="report-date-toolbar">
          <label>
            Date basis
            <select
              aria-label="Date basis"
              value={filters.date_basis}
              onChange={(e) => change('date_basis', e.target.value)}
            >
              {Object.entries(basisLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            From date
            <input
              type="date"
              required
              value={filters.date_from}
              max={filters.date_to || undefined}
              onChange={(e) => change('date_from', e.target.value)}
            />
          </label>
          <label>
            To date
            <input
              type="date"
              required
              value={filters.date_to}
              min={filters.date_from || undefined}
              onChange={(e) => change('date_to', e.target.value)}
            />
          </label>
          <span className="report-timezone">
            <UiIcon name="calendar" />
            <span>
              Asia/Bangkok<small>Dates follow your organization timezone</small>
            </span>
          </span>
        </div>
      </div>
      <div className="report-results" aria-busy={!data && !error && online}>
        {notice && <p role="status">{notice}</p>}
        {error && <ErrorNotice error={error} retry={() => setReload((n) => n + 1)} />}
        {!data && !error && online && <Loading />}
        {data && (
          <>
            <p className="report-period">
              <UiIcon name="calendar" />
              <span>
                Date basis: {basisLabels[data.metadata.date_basis]} ·{' '}
                {data.metadata.date_from ?? 'No start limit'} To{' '}
                {data.metadata.date_to ?? 'No end limit'} · Asia/Bangkok
              </span>
            </p>
            {!data.total && <EmptyState title="No tasks match these filters" />}
            <dl className="report-metrics">
              {[
                {
                  label: 'All tasks',
                  value: data.total,
                  tone: 'blue',
                  icon: 'table',
                  hint: 'Within the selected scope',
                },
                {
                  label: 'Overdue',
                  value: data.overdue,
                  tone: 'rose',
                  icon: 'calendar',
                  hint: 'Past due and unfinished',
                },
                {
                  label: 'Unassigned open tasks',
                  value: data.unassigned,
                  tone: 'amber',
                  icon: 'users',
                  hint: 'Waiting for an owner',
                },
                {
                  label: 'Completed in period',
                  value: data.done_in_period,
                  tone: 'green',
                  icon: 'check',
                  hint: 'Completed within these dates',
                },
                {
                  label: 'Completion rate',
                  value: data.completion_percentage,
                  tone: 'violet',
                  icon: 'overview',
                  hint: 'Current Done / all tasks',
                  percent: true,
                },
              ].map((metric, index) => (
                <div
                  key={metric.label}
                  className={`report-metric metric-${metric.tone}`}
                  style={{ '--report-delay': `${index * 45}ms` } as CSSProperties}
                >
                  <dt>
                    <span>{metric.label}</span>
                    <span className="report-metric-icon">
                      <UiIcon name={metric.icon} />
                    </span>
                  </dt>
                  <dd>
                    <ReportNumber
                      value={metric.value}
                      digits={metric.percent ? 2 : 0}
                      suffix={metric.percent ? '%' : ''}
                    />
                  </dd>
                  <small>{metric.hint}</small>
                </div>
              ))}
            </dl>
            <div className="report-panels">
              <section className="report-panel" aria-label="Status distribution">
                <div className="report-panel-heading">
                  <div>
                    <h2>Status distribution</h2>
                    <p>How work is progressing in this scope</p>
                  </div>
                  <span className="report-panel-icon">
                    <UiIcon name="overview" />
                  </span>
                </div>
                <div className="donut-wrap">
                  <div
                    className="donut"
                    role="img"
                    aria-label={`${Math.round(data.completion_percentage)}% done`}
                    style={{ background: donut(data.by_status, data.total) }}
                  >
                    <span>
                      <strong>
                        <ReportNumber value={data.completion_percentage} suffix="%" />
                      </strong>
                      <small>Done</small>
                    </span>
                  </div>
                </div>
                <div className="report-statuses">
                  {statuses.map((s) => (
                    <div key={s} className={`status-cell ${s}`}>
                      <i aria-hidden="true" />
                      <span>{statusLabel[s]}</span>
                      <strong>{data.by_status[s]}</strong>
                      <small>
                        {data.total ? Math.round((data.by_status[s] / data.total) * 100) : 0}%
                      </small>
                    </div>
                  ))}
                </div>
              </section>
              <section className="report-panel" aria-label="Open tasks by assignee">
                <div className="report-panel-heading">
                  <div>
                    <h2>Open tasks by assignee</h2>
                    <p>Only unfinished tasks are counted</p>
                  </div>
                  <span className="report-panel-icon">
                    <UiIcon name="workload" />
                  </span>
                </div>
                {data.workload.length ? (
                  <ul className="assignee-bars">
                    {data.workload.map((w, index) => {
                      const max = Math.max(...data.workload.map((x) => x.open_count), 1);
                      return (
                        <li
                          key={w.assignee?.id ?? 'none'}
                          className={`report-assignee assignee-color-${index % 5}`}
                        >
                          <span className="report-assignee-avatar" aria-hidden="true">
                            {w.assignee ? (
                              w.assignee.display_name
                                .trim()
                                .split(/\s+/)
                                .map((part) => part[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase()
                            ) : (
                              <UiIcon name="users" />
                            )}
                          </span>
                          <span className="bar-name">
                            {w.assignee
                              ? `${w.assignee.display_name}${w.assignee.active ? '' : ' (Inactive / history)'}`
                              : 'Unassigned'}
                            {w.job_title && <small> · {w.job_title}</small>}
                          </span>
                          <span className="bar-track" aria-hidden="true">
                            <i style={{ width: `${(w.open_count / max) * 100}%` }} />
                          </span>
                          <strong>{w.open_count}</strong>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p>No open tasks</p>
                )}
                <p className="report-note">
                  <UiIcon name="workload" />
                  <span>
                    Task counts indicate workload; they are not individual performance scores.
                  </span>
                </p>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
/** Animated display only; assistive technology always receives the exact final metric. */
function ReportNumber({
  value,
  digits = 0,
  suffix = '',
}: {
  value: number;
  digits?: number;
  suffix?: string;
}) {
  const scale = 10 ** digits;
  const shown = useCountUp(Math.round(value * scale));
  return (
    <span aria-label={`${value.toFixed(digits)}${suffix}`}>
      <span aria-hidden="true">
        {(shown / scale).toFixed(digits)}
        {suffix}
      </span>
    </span>
  );
}
const statusColors = { todo: '#b5bdce', doing: '#fdab3d', review: '#a25ddc', done: '#00c875' };
function donut(by: Record<keyof typeof statusColors, number>, total: number) {
  if (!total) return '#e6e9ef';
  let at = 0;
  const stops = (Object.keys(statusColors) as (keyof typeof statusColors)[]).map((k) => {
    const from = at;
    at += (by[k] / total) * 100;
    return `${statusColors[k]} ${from}% ${at}%`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}
