import type React from 'react';
import { useState } from 'react';
import { formatPlanDate } from './shared/formatPlanDate';
import { statusLabel, type Task } from './task-api';
import { calendarDays, dateAdd, ganttPlacement, monthAdd } from './task-dates';
function PagedTasks({
  tasks,
  title,
  open,
}: {
  tasks: Task[];
  title: string;
  open: (t: Task) => void;
}) {
  const [page, setPage] = useState(1),
    last = Math.max(1, Math.ceil(tasks.length / 50)),
    current = Math.min(page, last);
  return (
    <section className="date-list" aria-label={title}>
      <h3>
        {title} <span className="count-badge">{tasks.length}</span>
      </h3>
      <ul>
        {tasks.slice((current - 1) * 50, current * 50).map((t) => (
          <li key={t.id}>
            <button onClick={() => open(t)} aria-label={`Open task #${t.id} ${t.title}`}>
              {t.title}
            </button>
            <span>
              {t.start_date ? formatPlanDate(t.start_date) : 'No start date'} →{' '}
              {t.due_date ? formatPlanDate(t.due_date) : 'No due date'}
            </span>
          </li>
        ))}
      </ul>
      {tasks.length > 50 && (
        <div className="toolbar">
          <button disabled={current === 1} onClick={() => setPage(current - 1)}>
            Previous items
          </button>
          <span>
            {current}/{last}
          </span>
          <button disabled={current === last} onClick={() => setPage(current + 1)}>
            Next items
          </button>
        </div>
      )}
    </section>
  );
}
const monthTitle = (month: string) =>
  new Date(`${month}T00:00:00Z`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
export function CalendarView({
  tasks,
  today,
  open,
}: {
  tasks: Task[];
  today: string;
  open: (t: Task) => void;
}) {
  const [month, setMonth] = useState(today.slice(0, 7) + '-01');
  const all = [...new Set(calendarDays(month))];
  // Drop a trailing week that lies entirely in the next month (the mock shows 5 rows then).
  const days =
    all.length > 35 && all.slice(-7).every((d) => d.slice(0, 7) !== month.slice(0, 7))
      ? all.slice(0, -7)
      : all;
  const events = new Map<string, Task[]>();
  for (const t of tasks)
    if (t.due_date) {
      const list = events.get(t.due_date);
      if (list) list.push(t);
      else events.set(t.due_date, [t]);
    }
  const inMonth = tasks.filter(
    (t) => t.due_date && t.due_date >= days[0]! && t.due_date <= days.at(-1)!,
  );
  return (
    <section aria-label="Calendar">
      <div className="calendar-toolbar">
        <button
          className="icon-button"
          aria-label="Previous month"
          disabled={month === '0001-01-01'}
          onClick={() => setMonth(monthAdd(month, -1))}
        >
          ‹
        </button>
        <strong className="calendar-month">{monthTitle(month)}</strong>
        <button
          className="icon-button"
          aria-label="Next month"
          disabled={month === '9999-12-01'}
          onClick={() => setMonth(monthAdd(month, 1))}
        >
          ›
        </button>
        <span className="calendar-hint" title="Tasks are placed by End Plan (Asia/Bangkok)">
          Uses End Plan
        </span>
        <button onClick={() => setMonth(today.slice(0, 7) + '-01')}>Today</button>
      </div>
      <div className="calendar-scroll" tabIndex={0} aria-label="Calendar month">
        <div className="calendar-grid">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <strong className="weekday" key={d}>
              {d}
            </strong>
          ))}
          {days.map((d) => (
            <div
              className={`calendar-day ${d === today ? 'today' : ''} ${d.slice(0, 7) !== month.slice(0, 7) ? 'outside' : ''}`}
              key={d}
            >
              <time dateTime={d}>{Number(d.slice(8))}</time>
              {(events.get(d) ?? []).slice(0, 3).map((t) => (
                <button
                  key={t.id}
                  className={`calendar-event status-${t.status}`}
                  onClick={() => open(t)}
                  title={t.title}
                  aria-label={`Open task #${t.id} ${t.title}`}
                >
                  {t.title}
                </button>
              ))}
              {(events.get(d)?.length ?? 0) > 3 && (
                <span className="calendar-more">+{(events.get(d)?.length ?? 0) - 3} more</span>
              )}
            </div>
          ))}
        </div>
      </div>
      <PagedTasks
        tasks={tasks.filter((t) => !t.due_date)}
        title="Tasks without End Plan"
        open={open}
      />
      <details className="calendar-all">
        <summary>All tasks in this calendar range · {inMonth.length}</summary>
        <PagedTasks
          tasks={inMonth}
          title="Tasks with End Plan in this calendar range"
          open={open}
        />
      </details>
    </section>
  );
}
export function GanttView({
  tasks,
  today,
  open,
}: {
  tasks: Task[];
  today: string;
  open: (t: Task) => void;
}) {
  const [first, setFirst] = useState(dateAdd(today, -3)),
    [scale, setScale] = useState<'day' | 'week' | 'month'>('day'),
    [page, setPage] = useState(1);
  const length = { day: 14, week: 42, month: 90 }[scale],
    width = { day: 56, week: 24, month: 14 }[scale];
  const days = [...new Set(Array.from({ length }, (_, i) => dateAdd(first, i)))],
    end = days.at(-1)!,
    pct = 100 / days.length,
    todayIndex = days.indexOf(today);
  const bars = tasks
    .map((t) => ({ task: t, placement: ganttPlacement(t, first, days.length) }))
    .filter((x) => x.placement);
  const last = Math.max(1, Math.ceil(bars.length / 50)),
    current = Math.min(page, last);
  const groups: { label: string; span: number }[] = [];
  days.forEach((d, i) => {
    const label =
      scale === 'month' ? d.slice(0, 7) : scale === 'week' ? days[Math.floor(i / 7) * 7]! : d;
    const previous = groups.at(-1);
    if (previous?.label === label) previous.span++;
    else groups.push({ label, span: 1 });
  });
  const move = (days: number) => {
    setFirst(dateAdd(first, days));
    setPage(1);
  };
  return (
    <section aria-label="Gantt">
      <div className="calendar-toolbar">
        <button
          className="icon-button"
          aria-label="Previous range"
          disabled={first === '0001-01-01'}
          onClick={() => move(-length)}
        >
          ‹
        </button>
        <strong className="calendar-month">
          {formatPlanDate(first)} – {formatPlanDate(end)} {end.slice(0, 4)}
        </strong>
        <button
          className="icon-button"
          aria-label="Next period"
          disabled={end === '9999-12-31'}
          onClick={() => move(length)}
        >
          ›
        </button>
        <select
          aria-label="Range"
          value={scale}
          onChange={(e) => {
            setScale(e.target.value as typeof scale);
            setPage(1);
          }}
        >
          <option value="day">Days</option>
          <option value="week">Weeks</option>
          <option value="month">Months</option>
        </select>
        <span
          className="calendar-hint"
          title="Bars run from Start Plan to End Plan; ◆ marks tasks with End Plan only (Asia/Bangkok)"
        >
          Start Plan → End Plan
        </span>
        <button
          onClick={() => {
            setFirst(dateAdd(today, -3));
            setPage(1);
          }}
        >
          Today
        </button>
      </div>
      <div className="gantt-scroll" tabIndex={0} aria-label="Task timeline">
        <div
          className="gantt-canvas"
          style={
            { minWidth: 220 + days.length * 40, '--step': `${pct}%` } as React.CSSProperties
          }
        >
          <div className="gantt-heading">
            <strong>Task</strong>
            <div className="gantt-axis">
              {groups.map((g) => (
                <span key={g.label} style={{ width: `${g.span * pct}%` }}>
                  {scale === 'month' ? g.label : formatPlanDate(g.label)}
                </span>
              ))}
            </div>
          </div>
          {bars.slice((current - 1) * 50, current * 50).map(({ task: t, placement: p }) => (
            <div className="gantt-row" key={t.id}>
              <button className="gantt-title" onClick={() => open(t)} title={t.title}>
                {t.title}
              </button>
              <div className="gantt-track">
                {todayIndex >= 0 && (
                  <span
                    className="gantt-today"
                    aria-hidden="true"
                    style={{ left: `${(todayIndex + 0.5) * pct}%` }}
                  />
                )}
                {p && (
                  <button
                    className={`gantt-bar status-${t.status} ${p.marker ? 'gantt-marker' : ''}`}
                    style={{ left: `${p.offset * pct}%`, width: `${p.span * pct}%` }}
                    onClick={() => open(t)}
                    aria-label={`Open task #${t.id} ${t.title} · ${p.marker ? 'No Start Plan · ' : ''}${t.start_date ?? ''} To ${t.due_date} · ${statusLabel[t.status]}`}
                    title={`${t.title} · ${t.start_date ?? 'No start date'} → ${t.due_date}`}
                  >
                    {p.marker ? '' : p.span * width >= 72 ? t.title : ''}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {!bars.length && <p>No tasks in this range</p>}
      <div className="toolbar">
        <button disabled={current === 1} onClick={() => setPage(current - 1)}>
          Previous Gantt page
        </button>
        <span>
          Page {current}/{last} · {bars.length} of {tasks.length} tasks in range
        </span>
        <button disabled={current === last} onClick={() => setPage(current + 1)}>
          Next Gantt page
        </button>
      </div>
      <PagedTasks
        tasks={tasks.filter((t) => !t.start_date || !t.due_date)}
        title="Tasks with incomplete dates"
        open={open}
      />
    </section>
  );
}
