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

export function registerConfirmHost(handler: ((r: Request) => void) | undefined) {
  show = handler;
}
export type { Request as ConfirmRequest };
