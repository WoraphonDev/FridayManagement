/** Keep large assignment cleanups inside the 100-change event wire limit. */
export function checklistAudit(changes: { field: string; before: unknown; after: unknown }[]) {
  if (changes.length <= 50) return changes;
  return [
    {
      field: 'subtask',
      before: JSON.stringify(changes.map((c) => c.before)),
      after: JSON.stringify(changes.map((c) => c.after)),
    },
  ];
}
