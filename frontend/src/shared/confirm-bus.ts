/** In-app replacement for window.confirm: a Vibe modal that resolves true/false. */
type Request = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
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

export function registerConfirmHost(handler: ((r: Request) => void) | undefined) {
  show = handler;
}
export type { Request as ConfirmRequest };

export function discardDraft() {
  return confirmDialog({
    title: 'Discard changes?',
    message:
      'This form has unsaved changes. Stay to keep editing, or explicitly discard the draft.',
    confirmLabel: 'Discard draft',
    cancelLabel: 'Stay',
    danger: true,
  });
}

// In-memory only; local tabs do not pass through the router blocker.
const drafts = new Set<object>();
export function registerDraft(token: object) {
  drafts.add(token);
  return () => {
    drafts.delete(token);
  };
}
export async function leaveDrafts(action: () => void) {
  if (!drafts.size || (await discardDraft())) action();
}
