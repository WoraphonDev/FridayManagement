import { useCallback, useEffect, useRef, useState } from 'react';
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
const client = apiClient(),
  basisLabels = { created: "Created on", due: "Due date", completed: "Completed on" };
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
        setNotice("CSV downloaded using the current filters");
      }
    } catch (e) {
      if (!c.signal.aborted && e instanceof ApiError) {
        if (e.code === 'EXPORT_LIMIT_EXCEEDED')
          setNotice("Over 50,000 tasks. Narrow the date range or filters before exporting.");
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
                {!p.active ? " (Inactive)" : ''}
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
        <button disabled={!online || !data || exporting} onClick={() => void exportCSV()}>
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>
      {notice && <p role="status">{notice}</p>}
      {error && <ErrorNotice error={error} retry={() => setReload((n) => n + 1)} />}
      {!data && !error && online && <Loading />}
      {data && (
        <>
          <p className="muted">
            
            Date basis: {basisLabels[data.metadata.date_basis]} ·{' '}
            {data.metadata.date_from ?? "No start limit"}  To{' '}
            {data.metadata.date_to ?? "No end limit"} · Asia/Bangkok
          </p>
          {!data.total && <EmptyState title="No tasks match these filters" />}
          <dl className="report-metrics">
            {[
              ["All tasks", data.total],
              ["Overdue", data.overdue],
              ["Unassigned open tasks", data.unassigned],
              ["Completed in period", data.done_in_period],
              ["Completion rate", `${data.completion_percentage.toFixed(2)}%`],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="report-statuses">
            {statuses.map((s) => (
              <div key={s} className={`status-cell ${s}`}>
                <span>{statusLabel[s]}</span>
                <strong>{data.by_status[s]}</strong>
              </div>
            ))}
          </div>
          <h2>Open tasks by assignee</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Assignee</th>
                  <th>Job title</th>
                  <th>Open tasks</th>
                </tr>
              </thead>
              <tbody>
                {data.workload.length ? (
                  data.workload.map((w) => (
                    <tr key={w.assignee?.id ?? 'none'}>
                      <td>
                        {w.assignee
                          ? `${w.assignee.display_name}${w.assignee.active ? '' : " (Inactive / history)"}`
                          : "Unassigned"}
                      </td>
                      <td>{w.job_title ?? '—'}</td>
                      <td>{w.open_count}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3}>No open tasks</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="muted">
            
            Counts reflect your access and filters. They do not measure individual performance.
          </p>
        </>
      )}
    </div>
  );
}
