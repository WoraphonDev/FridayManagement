const paths: Record<string, string> = {
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  spark: 'M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM15 12a3 3 0 1 0-6 0 3 3 0 0 0 6 0',
  'eye-off': 'M3 3l18 18M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z',
  plus: 'M12 5v14M5 12h14',
  search: 'M21 21l-5-5M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14',
  filter: 'M3 5h18l-7 8v6l-4 2v-8z',
  calendar: 'M3 5h18v16H3zM3 10h18M8 3v4m8-4v4M7 14h3m4 0h3',
  table: 'M3 4h18v16H3zM3 10h18M9 4v16',
  kanban: 'M3 4h18v16H3zM8 8v7m4-7v4m4-4v9',
  check: 'M5 12l4 4L19 6',
  comment: 'M3 4h18v13H8l-5 4zM7 8h10m-10 4h7',
  file: 'M5 3h9l5 5v13H5zM14 3v6h5M9 13h6m-6 4h4',
  docs: 'M6 3h12v18H6zM9 7h6M9 11h6M9 15h4',
  files: 'M3 6h7l2 2h9v12H3z',
  history: 'M12 8v5l3 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20',
  more: 'M4 12h.01M12 12h.01M20 12h.01',
  trash: 'M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',
  close: 'M6 6l12 12M18 6 6 18',
  users:
    'M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M2 21v-3a6 6 0 0 1 12 0v3m3-16a4 4 0 0 1 0 8m1 3a5 5 0 0 1 4 5',
  gantt: 'M4 4v16h16M8 8h6M10 12h8M7 16h5',
  team: 'M4 8h16v12H4zM9 8V5h6v3M4 13h16',
  workload: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  overview: 'M12 3a9 9 0 1 0 9 9h-9z M14 3.3A9 9 0 0 1 20.7 10H14z',
};
export function UiIcon({ name }: { name: string }) {
  return (
    <svg
      className="ui-icon"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name] ?? paths.table} />
    </svg>
  );
}
