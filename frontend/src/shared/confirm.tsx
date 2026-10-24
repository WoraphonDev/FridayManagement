import { useEffect, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { discardDraft, registerDraft } from './confirm-bus';

/** Mount only while dirty; nested task editors retain their existing blocker. */
export function DraftProtection() {
  const blocker = useBlocker(true);
  useEffect(() => registerDraft({}), []);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    let active = true;
    void discardDraft().then((ok) => {
      if (active) {
        if (ok) blocker.proceed();
        else blocker.reset();
      }
    });
    return () => {
      active = false;
    };
  }, [blocker]);
  useEffect(() => {
    const stop = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', stop);
    return () => window.removeEventListener('beforeunload', stop);
  }, []);
  return null;
}
import { Dialog } from './components';
import { registerConfirmHost, type ConfirmRequest as Request } from './confirm-bus';

export function ConfirmHost() {
  const [request, setRequest] = useState<Request>();
  useEffect(() => {
    registerConfirmHost(setRequest);
    return () => {
      registerConfirmHost(undefined);
    };
  }, []);
  if (!request) return null;
  const finish = (ok: boolean) => {
    request.resolve(ok);
    setRequest(undefined);
  };
  return (
    <Dialog
      className="confirm-dialog"
      title={request.title}
      onClose={() => finish(false)}
      footer={
        <>
          <span className="footer-spacer" />
          {/* Focus the safe choice: Enter must not discard work by accident. */}
          <button data-autofocus onClick={() => finish(false)}>
            {request.cancelLabel ?? 'Cancel'}
          </button>
          <button
            className={request.danger ? 'danger primary' : 'primary'}
            onClick={() => finish(true)}
          >
            {request.confirmLabel}
          </button>
        </>
      }
    >
      <p>{request.message}</p>
    </Dialog>
  );
}
