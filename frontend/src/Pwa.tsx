import { useEffect, useState } from 'react';
import { UiIcon } from './shared/UiIcon';
import { Brand } from './Brand';
type InstallEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };
/**
 * G5: the floating Install control shows only before sign-in; signed-in users install from
 * Settings › Appearance (`mode="settings"`). The update notice stays available everywhere.
 */
export function Pwa({ mode = 'floating' }: { mode?: 'floating' | 'update-only' | 'settings' }) {
  const [install, setInstall] = useState<InstallEvent>();
  const [update, setUpdate] = useState(false);
  useEffect(() => {
    let disposed = false;
    const offer = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    const installed = () => setInstall(undefined);
    window.addEventListener('beforeinstallprompt', offer);
    window.addEventListener('appinstalled', installed);
    if ('serviceWorker' in navigator && window.isSecureContext && !import.meta.env.DEV) {
      void navigator.serviceWorker
        .register('/service-worker.js', { scope: '/', updateViaCache: 'none' })
        .then((registration) => {
          const check = () => {
            if (!disposed) setUpdate(Boolean(registration.waiting));
          };
          check();
          registration.addEventListener('updatefound', () =>
            registration.installing?.addEventListener('statechange', check),
          );
        })
        .catch(() => {
          /* Browser use remains available without installation. */
        });
    }
    return () => {
      disposed = true;
      window.removeEventListener('beforeinstallprompt', offer);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);
  const panel = (
    <div className="pwa-panel">
      {mode !== 'settings' && <Brand />}
      <h3>Your workspace, one click away</h3>
      <p>Open Friday in its own window and keep it close to your daily work.</p>
      {install ? (
        <button
          className="primary"
          onClick={() =>
            void install
              .prompt()
              .then(() => install.userChoice)
              .then(() => setInstall(undefined))
          }
        >
          <UiIcon name="download" /> Install Friday
        </button>
      ) : (
        <ol>
          <li>Open your browser’s menu or Share menu.</li>
          <li>Choose Install app or Add to Home Screen, when available.</li>
        </ol>
      )}
      <small>Availability depends on your browser. Installation uses HTTPS or localhost.</small>
    </div>
  );
  if (mode === 'settings')
    return (
      <section className="pwa-settings" aria-label="Install app">
        <h2>Install app</h2>
        {panel}
      </section>
    );
  return (
    <aside className="pwa-options" aria-label="Open as app">
      {mode === 'floating' && (
        <details className="pwa-install">
          <summary aria-label="Install or add to home screen">
            <UiIcon name="download" />
            <span>Install app</span>
          </summary>
          {panel}
        </details>
      )}
      {update && (
        <div className="pwa-update" role="status">
          <UiIcon name="spark" />
          <div>
            <strong>Update ready</strong>
            <p>Save your work, close all Friday windows, then reopen to update.</p>
          </div>
        </div>
      )}
    </aside>
  );
}
