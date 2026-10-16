import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { apiClient, ApiError } from './api';
import { displayName, newPassword, failureMessage } from './auth-policy';
import { registrationAccepted } from './registration-api';
import { Field, Form } from './shared/components';
const client = apiClient();
const inputSchema = z
  .object({
    display_name: displayName,
    email: z.email().max(254),
    password: newPassword,
    confirm: newPassword,
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match',
  });
export function Register({ online, onBack }: { online: boolean; onBack: () => void }) {
  const [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [pending, setPending] = useState(false),
    [done, setDone] = useState(false),
    [failure, setFailure] = useState(''),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [retryAt, setRetryAt] = useState(0),
    [now, setNow] = useState(() => Date.now());
  const busy = useRef(false),
    controller = useRef<AbortController>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!retryAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [retryAt]);
  return (
    <div className="setup-form login-form">
      <p className="eyebrow">JOIN YOUR WORKSPACE</p>
      <h1>Create an account</h1>
      <p className="login-intro">
        Register with your email. Your Admin must approve your account before you can sign in.
      </p>
      {failure && <p role="alert">{failure}</p>}
      {done ? (
        <p role="status">
          Registration received. Contact your Admin for approval before signing in.
        </p>
      ) : (
        <Form
          pending={pending}
          offline={!online}
          blocked={now < retryAt}
          submitLabel="Register"
          onSubmit={() => {
            if (busy.current) return;
            const parsed = inputSchema.safeParse({
              display_name: name,
              email: email.trim().toLowerCase(),
              password,
              confirm,
            });
            if (!parsed.success) {
              setErrors(
                Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])),
              );
              return;
            }
            busy.current = true;
            setPending(true);
            setErrors({});
            setFailure('');
            setPassword('');
            setConfirm('');
            controller.current = new AbortController();
            const body = {
              email: parsed.data.email,
              display_name: parsed.data.display_name,
              password: parsed.data.password,
            };
            void client
              .request('/api/register', {
                method: 'POST',
                body,
                signal: controller.current.signal,
                parse: (v) => registrationAccepted.parse(v),
              })
              .then(() => setDone(true))
              .catch((e: unknown) => {
                if (e instanceof Error && e.name === 'AbortError') return;
                setFailure(failureMessage(e));
                if (e instanceof ApiError) {
                  setErrors(e.fieldErrors);
                  if (e.status === 429) setRetryAt(Date.now() + (e.retryAfter ?? 5) * 1000);
                }
              })
              .finally(() => {
                busy.current = false;
                setPending(false);
              });
          }}
        >
          <Field
            label="Member name"
            value={name}
            maxLength={100}
            autoComplete="name"
            onChange={(e) => setName(e.target.value)}
            error={errors.display_name}
          />
          <Field
            label="Email"
            type="email"
            value={email}
            maxLength={254}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
          <Field
            label="Password"
            type="password"
            value={password}
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <Field
            label="Confirm password"
            type="password"
            value={confirm}
            autoComplete="new-password"
            onChange={(e) => setConfirm(e.target.value)}
            error={errors.confirm}
          />
        </Form>
      )}
      {now < retryAt && (
        <p role="status">Try again in {Math.ceil((retryAt - now) / 1000)} seconds</p>
      )}
      <button type="button" disabled={pending} onClick={onBack}>
        Back to sign in
      </button>
    </div>
  );
}
