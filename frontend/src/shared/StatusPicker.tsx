import { useRef } from 'react';
import { Dropdown } from '@vibe/core';
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
  const options = statuses.map((status) => ({ value: status, label: statusLabel[status] }));
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
      <Dropdown
        size="small"
        searchable={false}
        clearable={false}
        disabled={disabled}
        aria-label={label}
        inputAriaLabel={label}
        menuAriaLabel={`Options for ${label}`}
        options={options}
        value={options.find((o) => o.value === value)}
        onChange={(o) => choose(o.value as Status)}
      />
    </div>
  );
}
