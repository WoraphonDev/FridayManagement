import { useSharedRefresh } from './shared/refresh';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { organizationReply } from './organization-api';
import { apiClient, ApiError, type Self } from './api';
import { Loading, ErrorNotice, Field, Form, Toast } from './shared/components';
type Organization = z.infer<typeof organizationReply>['item'];
const client = apiClient();
export function OrganizationSettings({
  self,
  online,
  onFailure,
  onChange,
}: {
  self: Self;
  online: boolean;
  onFailure: (e: ApiError) => void;
  onChange: () => void;
}) {
  const [item, setItem] = useState<Organization>(),
    [name, setName] = useState(''),
    [error, setError] = useState<ApiError>(),
    [pending, setPending] = useState(false),
    [saved, setSaved] = useState(false),
    [changed, setChanged] = useState(false),
    [conflict, setConflict] = useState(false),
    [reviewed, setReviewed] = useState(false),
    [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    client
      .request('/api/organization', {
        signal: controller.signal,
        parse: (v) => organizationReply.parse(v),
      })
      .then((v) => {
        if (!controller.signal.aborted) {
          setItem(v.item);
          setName(v.item.name);
          setError(undefined);
        }
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted && e instanceof ApiError) {
          setError(e);
          onFailure(e);
        }
      });
    return () => controller.abort();
  }, [reload, onFailure]);
  const current = useRef({ item, name, pending });
  useEffect(() => {
    current.current = { item, name, pending };
  }, [item, name, pending]);
  useSharedRefresh(
    async (signal) => {
      if (current.current.pending) return;
      try {
        const r = await client.request('/api/organization', {
          signal,
          parse: (v) => organizationReply.parse(v),
        });
        const state = current.current;
        if (signal.aborted || state.pending || !state.item || r.item.version <= state.item.version)
          return;
        if (state.name !== state.item.name) setChanged(true);
        else {
          setItem(r.item);
          setName(r.item.name);
          setChanged(false);
        }
      } catch (e) {
        if (!signal.aborted && e instanceof ApiError) onFailure(e);
      }
    },
    online,
    self.csrf,
  );
  const save = async () => {
    if (!item || pending) return;
    setPending(true);
    setSaved(false);
    setError(undefined);
    try {
      const result = await client.request('/api/organization', {
        method: 'PATCH',
        csrf: self.csrf,
        body: { name: name.trim(), version: item.version },
        parse: (v) => organizationReply.parse(v),
      });
      setChanged(false);
      setItem(result.item);
      setName(result.item.name);
      setConflict(false);
      setReviewed(false);
      setSaved(true);
      onChange();
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e);
        onFailure(e);
        if (e.kind === 'conflict') {
          setConflict(true);
          setReviewed(false);
          try {
            const fresh = await client.request('/api/organization', {
              parse: (v) => organizationReply.parse(v),
            });
            setItem(fresh.item);
          } catch (readError) {
            if (readError instanceof ApiError) {
              setError(readError);
              onFailure(readError);
            }
          }
        }
      }
    } finally {
      setPending(false);
    }
  };
  return (
    <section aria-label="Organization settings">
      <h2>Organization</h2>
      {error && (
        <ErrorNotice error={error} retry={!item ? () => setReload((n) => n + 1) : undefined} />
      )}
      {changed && <Toast>Data changed. Your draft is preserved.</Toast>}
      {saved && <Toast>Organization name saved</Toast>}
      {!item ? (
        !error && <Loading />
      ) : self.user.org_role !== 'admin' ? (
        <dl>
          <dt>Organization name</dt>
          <dd>{item.name}</dd>
          <dt>Time zone</dt>
          <dd>{item.timezone}</dd>
        </dl>
      ) : (
        <>
          <p>Time zone: {item.timezone}</p>
          {conflict && (
            <>
              <p>Current name: {item.name}  · Your draft is preserved</p>
              <label>
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(e) => setReviewed(e.target.checked)}
                />
                
                Latest data reviewed
              </label>
            </>
          )}
          <Form
            onSubmit={() => void save()}
            pending={pending}
            offline={!online}
            blocked={self.maintenance}
            submitDisabled={!name.trim() || name.trim().length > 100 || (conflict && !reviewed)}
            submitLabel="Save organization name"
          >
            <Field
              label="Organization name"
              value={name}
              maxLength={100}
              required
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
            />
          </Form>
        </>
      )}
    </section>
  );
}
