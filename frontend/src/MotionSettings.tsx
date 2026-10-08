import { useState } from 'react';
import { ApiError, type Self } from './api';
import { savePreferences, usePreferences } from './preferences';
import { Toast } from './shared/components';
/** T-089 Settings: Reduce animations and confetti; the OS reduced-motion setting always wins. */
export function MotionSettings({
  self,
  online,
  onFailure,
}: {
  self: Self;
  online: boolean;
  onFailure: (e: ApiError) => void;
}) {
  const prefs = usePreferences(self.csrf),
    [saved, setSaved] = useState('');
  const set = async (patch: { reduce_motion?: boolean; confetti?: boolean }, message: string) => {
    try {
      await savePreferences(self.csrf, patch);
      setSaved(message);
    } catch (e) {
      if (e instanceof ApiError) onFailure(e);
    }
  };
  return (
    <section aria-label="Motion settings">
      <h2>Motion</h2>
      {saved && <Toast>{saved}</Toast>}
      <label className="toggle">
        <input
          type="checkbox"
          checked={prefs.reduce_motion}
          disabled={!online}
          onChange={(e) =>
            void set({ reduce_motion: e.target.checked }, 'Animation preference saved')
          }
        />{' '}
        Reduce animations
      </label>
      <label className="toggle">
        <input
          type="checkbox"
          checked={prefs.confetti}
          disabled={!online || prefs.reduce_motion}
          onChange={(e) => void set({ confetti: e.target.checked }, 'Confetti preference saved')}
        />{' '}
        Celebrate Done with confetti
      </label>
      <p className="hint">Your device’s “reduce motion” setting also turns animations off.</p>
    </section>
  );
}
