export function formatPlanDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
        new Date(value + 'T00:00:00Z'),
      )
    : '—';
}
