import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { apiClient } from './api';
import { subscribeRefresh } from './shared/refresh';
// T-090 FR-47: private favorites; the server filters by current access on every read.
const client = apiClient();
export const favoritesSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            project_id: z.number().int().min(1),
            project_name: z.string().min(1).max(100),
            owner_team_name: z.string().min(1).max(100),
            archived: z.boolean(),
            created_at: z.string().datetime(),
          })
          .strict(),
      )
      .max(100),
  })
  .strict();
export type Favorite = z.infer<typeof favoritesSchema>['items'][number];
const changed = 'friday:favorites-changed';
/** Shared favorites state for the sidebar and every project header in this tab. */
export function useFavorites(csrf: string | undefined, online: boolean) {
  const [items, setItems] = useState<Favorite[]>([]);
  const read = useCallback(
    async (signal?: AbortSignal) => {
      if (!csrf) return;
      try {
        const v = await client.request('/api/me/favorites', {
          signal,
          parse: (x) => favoritesSchema.parse(x).items,
        });
        if (!signal?.aborted) setItems(v);
      } catch {
        /* The session reader owns authentication errors; keep the last list. */
      }
    },
    [csrf],
  );
  useEffect(() => {
    if (!csrf || !online) return;
    const c = new AbortController();
    void Promise.resolve().then(() => {
      if (!c.signal.aborted) return read(c.signal);
    });
    const again = () => void read();
    window.addEventListener(changed, again);
    const unsubscribe = subscribeRefresh(read);
    return () => {
      c.abort();
      window.removeEventListener(changed, again);
      unsubscribe();
    };
  }, [csrf, online, read]);
  const toggle = useCallback(
    async (project: number, on: boolean) => {
      if (!csrf) return;
      const v = await client.request(`/api/me/favorites/${project}`, {
        method: on ? 'PUT' : 'DELETE',
        csrf,
        parse: (x) => favoritesSchema.parse(x).items,
      });
      setItems(v);
      window.dispatchEvent(new Event(changed));
    },
    [csrf],
  );
  return { items, toggle };
}
