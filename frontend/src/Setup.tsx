import { useEffect, useRef, useState, type FormEvent } from 'react';
import { validateSetup } from './setup-policy';
import { apiClient, ApiError, metaSchema, setupReplySchema } from './api';
import { Field, ErrorNotice } from './shared/components';
const empty = { token: '', organization_name: '', username: '', display_name: '', password: '' };
export function Setup({
  online,
  onDone,
}: {
  online: boolean;
  onDone: (result: 'created' | 'existing') => void;
}) {
  const [fields, setFields] = useState(empty),
    [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<ApiError>();
  const pending = useRef(false),
    controller = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => controller.current?.abort(), []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !online) return;
    const parsed = validateSetup(fields);
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
        ),
      );
      return;
    }
    pending.current = true;
    setBusy(true);
    setErrors({});
    setError(undefined);
    setFields((current) => ({ ...current, token: '', password: '' }));
    const abort = new AbortController();
    controller.current = abort;
    const client = apiClient();
    try {
      await client.request('/api/setup', {
        method: 'POST',
        body: parsed.data,
        signal: abort.signal,
        parse: (value) => setupReplySchema.parse(value),
      });
      if (!abort.signal.aborted) {
        setFields(empty);
        onDone('created');
      }
    } catch (reason: unknown) {
      if (abort.signal.aborted) return;
      const failure = reason instanceof ApiError ? reason : new ApiError('unavailable', 503);
      if (failure.status === 409 || failure.kind === 'offline' || failure.kind === 'unavailable') {
        try {
          const meta = await client.request('/api/meta', {
            signal: abort.signal,
            parse: (value) => metaSchema.parse(value),
          });
          if (!meta.setupRequired) {
            setFields(empty);
            onDone('existing');
            return;
          }
        } catch {
          /* No credential retry; keep the safe original error. */
        }
      }
      setError(failure);
      setErrors(failure.fieldErrors);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      className="setup-form"
      onSubmit={submit}
      noValidate
      aria-label="First-time setup"
      aria-busy={busy}
    >
      <p>Use the setup token from the installer console to create your first administrator. No default credentials exist.</p>
      <Field
        label="Setup token"
        name="token"
        type="password"
        autoComplete="off"
        required
        value={fields.token}
        onChange={(e) => setFields({ ...fields, token: e.target.value })}
        error={errors.token}
        disabled={busy}
      />
      <Field
        label="Organization name"
        name="organization_name"
        required
        maxLength={100}
        value={fields.organization_name}
        onChange={(e) => setFields({ ...fields, organization_name: e.target.value })}
        error={errors.organization_name}
        disabled={busy}
      />
      <Field
        label="Admin username"
        name="username"
        autoComplete="username"
        required
        maxLength={60}
        value={fields.username}
        onChange={(e) => setFields({ ...fields, username: e.target.value })}
        error={errors.username}
        disabled={busy}
      />
      <Field
        label="Display name"
        name="display_name"
        required
        maxLength={100}
        value={fields.display_name}
        onChange={(e) => setFields({ ...fields, display_name: e.target.value })}
        error={errors.display_name}
        disabled={busy}
      />
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        value={fields.password}
        onChange={(e) => setFields({ ...fields, password: e.target.value })}
        error={errors.password}
        hint="6–128 characters. Spaces are preserved."
        disabled={busy}
      />
      {error?.code === 'INVALID_SETUP_TOKEN' ? (
        <div role="alert">
          <p>Invalid token. Check the installer console and enter the token and password again.</p>
          {error.requestId && <p>Reference ID: {error.requestId}</p>}
        </div>
      ) : error?.status === 429 ? (
        <p role="alert">Too many setup attempts. Wait and try again.</p>
      ) : (
        error && <ErrorNotice error={error} />
      )}
      <button type="submit" disabled={busy || !online}>
        {busy ? "Setting up…" : "Create administrator and finish setup"}
      </button>
    </form>
  );
}
