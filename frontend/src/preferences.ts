import { useEffect, useState } from 'react';
import { z } from 'zod';
import { apiClient } from './api';
// T-089 per-user UI preferences (contract 1.7.0); one shared store for the whole tab.
const client = apiClient();
export const preferencesSchema = z
  .object({
    reduce_motion: z.boolean(),
    confetti: z.boolean(),
    column_widths: z.record(z.string().regex(/^[a-z_]{1,40}$/), z.number().int().min(60).max(800)),
    hidden_tabs: z
      .array(z.enum(['kanban', 'calendar', 'gantt', 'docs', 'files', 'workload', 'overview']))
      .max(7),
  })
  .strict();
export type Preferences = z.infer<typeof preferencesSchema>;
const reply = z.object({ item: preferencesSchema }).strict();
export const defaultPreferences: Preferences = {
  reduce_motion: false,
  confetti: true,
  column_widths: {},
  hidden_tabs: [],
};
let current: Preferences = defaultPreferences;
let loadedFor: string | undefined;
const listeners = new Set<(p: Preferences) => void>();
const publish = (p: Preferences) => {
  current = p;
  document.documentElement.classList.toggle('reduce-motion', p.reduce_motion);
  for (const l of listeners) l(p);
};
export function currentPreferences() {
  return current;
}
/** Load once per session; failures keep defaults so the UI never blocks on preferences. */
export async function loadPreferences(csrf: string) {
  if (loadedFor === csrf) return current;
  loadedFor = csrf;
  try {
    publish(await client.request('/api/me/preferences', { parse: (v) => reply.parse(v).item }));
  } catch {
    loadedFor = undefined;
  }
  return current;
}
export async function savePreferences(csrf: string, patch: Partial<Preferences>) {
  publish({ ...current, ...patch });
  const saved = await client.request('/api/me/preferences', {
    method: 'PATCH',
    csrf,
    body: patch,
    parse: (v) => reply.parse(v).item,
  });
  publish(saved);
  return saved;
}
export function usePreferences(csrf: string | undefined) {
  const [value, setValue] = useState(current);
  useEffect(() => {
    listeners.add(setValue);
    if (csrf) void loadPreferences(csrf);
    return () => {
      listeners.delete(setValue);
    };
  }, [csrf]);
  return value;
}
