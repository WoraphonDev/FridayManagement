import { useId } from 'react';
import { Field } from './shared/components';
import {
  emptyProjectDelivery,
  hasProjectDeliveryDraft,
  type ProjectDeliveryDraft,
} from './delivery-preview';
import './delivery-preview.css';

function PreviewNote({ id }: { id: string }) {
  return (
    <p id={id} className="delivery-preview-note">
      UI preview · Not saved yet. These fields stay only while this form is open and are discarded
      when you close it or save existing fields.
    </p>
  );
}

export function ProjectDeliveryPreview({
  value,
  onChange,
}: {
  value: ProjectDeliveryDraft;
  onChange: (value: ProjectDeliveryDraft) => void;
}) {
  const noteId = useId();
  const change = (key: keyof ProjectDeliveryDraft, text: string) =>
    onChange({ ...value, [key]: text });
  const textArea = (
    key: keyof ProjectDeliveryDraft,
    label: string,
    limit: number,
    placeholder: string,
  ) => (
    <label>
      {label}
      <textarea
        aria-label={label}
        rows={3}
        value={value[key]}
        maxLength={limit}
        placeholder={placeholder}
        onChange={(e) => change(key, e.target.value)}
      />
    </label>
  );
  return (
    <details className="delivery-preview" open aria-describedby={noteId}>
      <summary>
        Delivery setup <span>UI preview</span>
      </summary>
      <div className="delivery-preview-content">
        <PreviewNote id={noteId} />
        <label>
          Delivery mode
          <select
            aria-label="Delivery mode"
            value={value.mode}
            onChange={(e) => change('mode', e.target.value)}
          >
            <option value="">Choose delivery mode</option>
            <option value="finite">Finite delivery</option>
            <option value="ongoing">Ongoing operations</option>
          </select>
        </label>
        {textArea(
          'objective',
          'Project objective',
          2000,
          'What outcome should this project achieve?',
        )}
        <div className="delivery-preview-grid">
          <Field
            label="Project lead"
            value={value.lead}
            maxLength={200}
            placeholder="Name for this preview"
            onChange={(e) => change('lead', e.target.value)}
          />
          <Field
            label="Delivery acceptor"
            value={value.acceptor}
            maxLength={200}
            placeholder="Who will confirm delivery?"
            onChange={(e) => change('acceptor', e.target.value)}
          />
        </div>
        <p className="delivery-preview-hint">
          Names are for preview only. They do not assign people or change access.
        </p>
        {value.mode === 'finite' && (
          <div className="delivery-preview-grid">
            <Field
              label="Planned project start"
              type="date"
              value={value.start}
              onChange={(e) => change('start', e.target.value)}
            />
            <Field
              label="Target delivery date"
              type="date"
              value={value.target}
              onChange={(e) => change('target', e.target.value)}
            />
            {value.start && value.target && value.start > value.target && (
              <p role="alert">Project start must be on or before target delivery.</p>
            )}
          </div>
        )}
        {value.mode === 'ongoing' && (
          <Field
            label="Next review date"
            type="date"
            value={value.review}
            onChange={(e) => change('review', e.target.value)}
          />
        )}
        <details className="delivery-preview-scope">
          <summary>Scope &amp; acceptance</summary>
          <div className="delivery-preview-content">
            {textArea(
              'criteria',
              'Acceptance criteria',
              4000,
              'What must be true for the work to be accepted?',
            )}
            {textArea('inScope', 'In scope', 4000, 'What will this project deliver?')}
            {textArea('outScope', 'Out of scope', 4000, 'What is outside this project?')}
          </div>
        </details>
        {hasProjectDeliveryDraft(value) && (
          <button type="button" onClick={() => onChange(emptyProjectDelivery())}>
            Clear delivery preview
          </button>
        )}
      </div>
    </details>
  );
}

export function TaskOwnerPreview({
  people,
  value,
  onChange,
}: {
  people: { id: number; display_name: string }[];
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const noteId = useId();
  return (
    <section
      className="delivery-preview"
      aria-label="Task responsibility preview"
      aria-describedby={noteId}
    >
      <h3>
        Responsibility <span>UI preview</span>
      </h3>
      <PreviewNote id={noteId} />
      <label>
        Primary task owner
        <select
          aria-label="Primary task owner"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Choose primary owner</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.display_name}
            </option>
          ))}
        </select>
      </label>
      <p className="delivery-preview-hint">
        One accountable owner, separate from Assignees. Selecting here does not change
        collaborators.
      </p>
      {people.length === 0 && (
        <p className="delivery-preview-hint">No eligible people available.</p>
      )}
    </section>
  );
}
