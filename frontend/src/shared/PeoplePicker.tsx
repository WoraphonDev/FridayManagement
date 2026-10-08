import { Dropdown, Avatar } from '@vibe/core';
export type Person = { id: number; display_name: string; active?: boolean };
export function PeoplePicker({
  label,
  people,
  value,
  onChange,
  disabled = false,
  multiple = true,
}: {
  label: string;
  people: Person[];
  value: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
  multiple?: boolean;
}) {
  const options = people.map((p) => ({
    value: String(p.id),
    label: p.display_name,
    disabled: p.active === false,
  }));
  const shared = {
    options,
    size: 'small' as const,
    disabled,
    searchable: false as const,
    inputAriaLabel: label,
    'aria-label': label,
    clearAriaLabel: `Clear ${label}`,
    menuAriaLabel: `Options for ${label}`,
    placeholder: 'Unassigned',
  };
  return (
    <div className="people-picker">
      {multiple ? (
        <Dropdown
          {...shared}
          multi
          multiline
          clearable
          value={options.filter((o) => value.includes(Number(o.value)))}
          onChange={(selected) => onChange(selected.map((o) => Number(o.value)))}
        />
      ) : (
        <Dropdown
          {...shared}
          value={[{ value: '', label: 'Unassigned' }, ...options].find(
            (o) => o.value === String(value[0] ?? ''),
          )}
          options={[{ value: '', label: 'Unassigned' }, ...options]}
          onChange={(selected) => onChange(selected.value ? [Number(selected.value)] : [])}
        />
      )}
    </div>
  );
}
export function Assignees({ people, compact = false }: { people: Person[]; compact?: boolean }) {
  return (
    <span className={`task-assignees ${compact ? 'compact' : ''}`}>
      {people.map((p) => (
        <span className="person-chip" key={p.id} title={compact ? p.display_name : undefined}>
          <Avatar
            type="text"
            text={p.display_name
              .trim()
              .split(/\s+/)
              .map((s) => s[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
            customSize={24}
            customBackgroundColor="#e9e0fb"
            textClassName="person-initials"
            aria-label={p.display_name}
            withoutTooltip
          />
          <span className={compact ? 'visually-hidden' : undefined}>{p.display_name}</span>
        </span>
      ))}
      {!people.length &&
        (compact ? (
          <span className="unassigned-avatar" title="Unassigned">
            <span aria-hidden="true">-</span>
            <span className="visually-hidden">Unassigned</span>
          </span>
        ) : (
          <span className="muted">Unassigned</span>
        ))}
    </span>
  );
}
