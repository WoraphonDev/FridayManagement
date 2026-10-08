import { Dropdown } from '@vibe/core';
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
  return (
    <div className="status-picker" data-status={value}>
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
        onChange={(o) => onChange(o.value as Status)}
      />
    </div>
  );
}
