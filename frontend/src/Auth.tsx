import { useEffect, useRef, useState } from 'react';
import { apiClient, ApiError, selfSchema, type Self } from './api';
import { UiIcon } from './shared/UiIcon';
import { loginSchema, passwordSchema, failureMessage } from './auth-policy';
import { Field, Form, Toast, Dialog } from './shared/components';
const client = apiClient();
type Props = {
  online: boolean;
  onDone: (self: Self) => void;
  onFailure: (error: ApiError) => void;
};
export function Login({ online, onDone, onFailure }: Props) {
  const [help, setHelp] = useState(false);
  const [username, setUsername] = useState(''),
    [password, setPassword] = useState(''),
    [show, setShow] = useState(false),
    [pending, setPending] = useState(false),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [failure, setFailure] = useState(''),
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
      <p className="eyebrow">YOUR WORK, IN SYNC</p>
      <h1>Welcome back</h1>
      <p className="login-intro">Sign in to your workspace and pick up where you left off</p>
      {failure && <p role="alert">{failure}</p>}
      <Form
        offline={!online}
        pending={pending}
        blocked={now < retryAt}
        submitLabel="Sign in"
        submitAdornment={<UiIcon name="arrow" />}
        onSubmit={() => {
          if (busy.current) return;
          const result = loginSchema.safeParse({ username, password });
          if (!result.success) {
            setErrors(
              Object.fromEntries(result.error.issues.map((i) => [String(i.path[0]), i.message])),
            );
            return;
          }
          busy.current = true;
          setPending(true);
          setErrors({});
          setFailure('');
          setPassword('');
          setShow(false);
          controller.current = new AbortController();
          void client
            .request('/api/login', {
              method: 'POST',
              body: result.data,
              signal: controller.current.signal,
              parse: (v) => selfSchema.parse(v),
            })
            .then(onDone)
            .catch((e: unknown) => {
              if (e instanceof Error && e.name === 'AbortError') return;
              setFailure(failureMessage(e));
              if (e instanceof ApiError) {
                setErrors(e.fieldErrors);
                if (e.status === 429) setRetryAt(Date.now() + (e.retryAfter ?? 5) * 1000);
                onFailure(e);
              }
            })
            .finally(() => {
              busy.current = false;
              setPending(false);
            });
        }}
      >
        <Field
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          placeholder="Username provided by your Admin"
          maxLength={100}
          error={errors.username}
        />
        <div className="login-password">
          <Field
            label="Password"
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="Enter password"
            error={errors.password}
          />
          <button
            className="password-toggle"
            type="button"
            aria-label={show ? 'Hide password' : 'Show password'}
            aria-pressed={show}
            onClick={() => setShow((v) => !v)}
          >
            <UiIcon name={show ? 'eye-off' : 'eye'} />
          </button>
        </div>
        <div className="login-assistance">
          <span>Internal account</span>
          <button type="button" onClick={() => setHelp(true)}>
            Need help signing in?
          </button>
        </div>
      </Form>
      {help && (
        <Dialog title="Sign-in help" onClose={() => setHelp(false)}>
          <p>Use the username and password provided by your organization’s Admin.</p>
          <p>
            If you forgot your password or your account is inactive, contact your Admin to restore
            access. There is no email reset link.
          </p>
        </Dialog>
      )}
      {now < retryAt && (
        <p role="status">Try again in {Math.ceil((retryAt - now) / 1000)} seconds</p>
      )}
    </div>
  );
}
export function Password({ self, online, onDone, onFailure }: Props & { self: Self }) {
  const [current, setCurrent] = useState(''),
    [next, setNext] = useState(''),
    [confirm, setConfirm] = useState(''),
    [show, setShow] = useState(false),
    [pending, setPending] = useState(false),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [failure, setFailure] = useState(''),
    [done, setDone] = useState(false);
  const busy = useRef(false),
    controller = useRef<AbortController>(null);
  useEffect(() => () => controller.current?.abort(), []);
  return (
    <div className="setup-form">
      <h2>Change password</h2>
      {done && <Toast>Password changed. Other sessions have been signed out.</Toast>}
      {failure && <p role="alert">{failure}</p>}
      <Form
        pending={pending}
        offline={!online}
        submitLabel="Change password"
        onSubmit={() => {
          if (busy.current) return;
          const result = passwordSchema.safeParse({
            current_password: current,
            new_password: next,
            confirm,
          });
          if (!result.success) {
            setErrors(
              Object.fromEntries(result.error.issues.map((i) => [String(i.path[0]), i.message])),
            );
            return;
          }
          busy.current = true;
          setPending(true);
          setFailure('');
          setErrors({});
          setDone(false);
          setCurrent('');
          setNext('');
          setConfirm('');
          setShow(false);
          controller.current = new AbortController();
          void client
            .request('/api/password', {
              method: 'POST',
              csrf: self.csrf,
              body: {
                current_password: result.data.current_password,
                new_password: result.data.new_password,
              },
              signal: controller.current.signal,
              parse: (v) => selfSchema.parse(v),
            })
            .then((v) => {
              setDone(true);
              onDone(v);
            })
            .catch((e: unknown) => {
              if (e instanceof Error && e.name === 'AbortError') return;
              setFailure(failureMessage(e));
              if (e instanceof ApiError) {
                setErrors(e.fieldErrors);
                onFailure(e);
              }
            })
            .finally(() => {
              busy.current = false;
              setPending(false);
            });
        }}
      >
        <Field
          label="Current password"
          type={show ? 'text' : 'password'}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          error={errors.current_password}
          autoComplete="current-password"
        />
        <Field
          label="New password"
          type={show ? 'text' : 'password'}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          error={errors.new_password}
          autoComplete="new-password"
          hint="6–128 characters. Spaces are part of your password."
        />
        <Field
          label="Confirm new password"
          type={show ? 'text' : 'password'}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
          autoComplete="new-password"
        />
        <button type="button" aria-pressed={show} onClick={() => setShow((v) => !v)}>
          {show ? 'Hide password' : 'Show password'}
        </button>
      </Form>
    </div>
  );
}
