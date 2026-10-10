import { CellPopover } from './CellPopover';
import { UiIcon } from './UiIcon';

export function ChecklistStatusPicker({
  done,
  label,
  disabled,
  onChange,
}: {
  done: boolean;
  label: string;
  disabled?: boolean;
  onChange: (done: boolean) => void;
}) {
  return (
    <div className="status-picker" data-status={done ? 'done' : 'todo'}>
      <CellPopover
        label={label}
        disabled={disabled}
        className="status-cell"
        value={<span className="status-cell-label">{done ? 'Done' : 'To do'}</span>}
      >
        {(close) => (
          <div role="listbox" aria-label={`Options for ${label}`}>
            {[false, true].map((next) => (
              <button
                type="button"
                key={String(next)}
                role="option"
                aria-label={next ? 'Done' : 'To do'}
                aria-selected={done === next}
                data-status={next ? 'done' : 'todo'}
                className="status-option"
                onClick={() => {
                  if (next !== done) onChange(next);
                  close();
                }}
              >
                {next ? 'Done' : 'To do'}
                {next === done && <UiIcon name="check" />}
              </button>
            ))}
          </div>
        )}
      </CellPopover>
    </div>
  );
}
