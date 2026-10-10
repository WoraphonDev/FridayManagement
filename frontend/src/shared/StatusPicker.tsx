import { useRef } from 'react';
import { CellPopover } from './CellPopover';
import { UiIcon } from './UiIcon';
import { confettiFrom, replay } from '../motion';
import { statuses, statusLabel, type Status } from '../task-api';
export function StatusPicker({
  value,
  label,
  disabled,
  onChange,
}: {
  value: Status;
  label: string;
  disabled?: boolean;
  onChange: (status: Status) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  // AN-03 pulse on the user's choice; AN-04 confetti only when it becomes Done. The list may
  // remount after the save, so motion follows the action rather than the next render.
  const choose = (next: Status) => {
    if (next !== value) {
      replay(root.current, 'status-pulse');
      if (next === 'done') confettiFrom(root.current);
    }
    onChange(next);
  };
  return (
    <div className="status-picker" data-status={value} ref={root}>
      <CellPopover
        label={label}
        disabled={disabled}
        className="status-cell"
        value={<span className="status-cell-label">{statusLabel[value]}</span>}
      >
        {(close) => (
          <div role="listbox" aria-label={`Options for ${label}`}>
            {statuses.map((status) => (
              <button
                type="button"
                key={status}
                role="option"
                aria-label={statusLabel[status]}
                aria-selected={value === status}
                data-status={status}
                className="status-option"
                onClick={() => {
                  choose(status);
                  close();
                }}
              >
                {statusLabel[status]}
                {value === status && <UiIcon name="check" />}
              </button>
            ))}
          </div>
        )}
      </CellPopover>
    </div>
  );
}
