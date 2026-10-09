import { useEffect, useState } from 'react';
import { Dialog } from './components';

/** In-app replacement for window.confirm: a Vibe modal that resolves true/false. */
type Request = {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
};
let show: ((r: Request) => void) | undefined;

export function confirmDialog(options: Omit<Request, 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => {
    if (!show) {
      resolve(window.confirm(options.message));
      return;
    }
    show({ ...options, resolve });
  });
}

export function ConfirmHost() {
  const [request, setRequest] = useState<Request>();
  useEffect(() => {
    show = setRequest;
    return () => {
      show = undefined;
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
