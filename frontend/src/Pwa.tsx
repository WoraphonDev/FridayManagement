import { useEffect, useState } from 'react';
import { UiIcon } from './shared/UiIcon';
import { Brand } from './Brand';
type InstallEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };
/**
 * G5: Install is offered only from Settings › Appearance (`mode="settings"`); no floating
 * control on any page. `update-only` just registers the service worker. Waiting updates apply
 * after all windows close.
 */
export function Pwa({ mode = 'update-only' }: { mode?: 'update-only' | 'settings' }) {
  const [install, setInstall] = useState<InstallEvent>();
  useEffect(() => {
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
        .catch(() => {
          /* Browser use remains available without installation. */
        });
    }
    return () => {
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
  return null;
}
