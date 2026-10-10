import { Avatar } from '@vibe/core';
import { useState } from 'react';
import { CellPopover } from './CellPopover';
import { UiIcon } from './UiIcon';
export type Person = { id: number; display_name: string; active?: boolean; role?: string };
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
  const [search, setSearch] = useState('');
  const filtered = people.filter((p) =>
    `${p.display_name} ${p.role ?? ''}`
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase()),
  );
  return (
    <div className="people-picker">
      <CellPopover
        label={label}
        disabled={disabled}
        multiple={multiple}
        className="person-cell"
        value={
          <Assignees compact={!multiple} people={people.filter((p) => value.includes(p.id))} />
        }
      >
        {(close) => (
          <>
            <input
              type="search"
              className="person-search"
              aria-label={`Search ${label}`}
              placeholder="Search names or roles"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <p className="picker-section-label">Suggested people</p>
            <div role="listbox" aria-label={`Options for ${label}`} aria-multiselectable={multiple}>
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-label={p.display_name}
                  aria-selected={value.includes(p.id)}
                  disabled={p.active === false}
                  className="person-option"
                  onClick={() => {
                    onChange(
                      multiple
                        ? value.includes(p.id)
                          ? value.filter((id) => id !== p.id)
                          : [...value, p.id]
                        : [p.id],
                    );
                    if (!multiple) {
                      setSearch('');
                      close();
                    }
                  }}
                >
                  <Assignees people={[p]} />
                  {p.role && <small>{p.role}</small>}
                  {value.includes(p.id) && <UiIcon name="check" />}
                </button>
              ))}
              {!filtered.length && <p role="status">No matching people</p>}
              <button
                type="button"
                role="option"
                aria-label="Unassigned"
                aria-selected={!value.length}
                className="person-option unassign-option"
                onClick={() => {
                  onChange([]);
                  setSearch('');
                  close();
                }}
              >
                <UiIcon name="users" /> Unassigned
              </button>
            </div>
          </>
        )}
      </CellPopover>
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
