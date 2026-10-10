import { useEffect, useState } from 'react';
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
            Cancel
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
