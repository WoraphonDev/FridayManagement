import { DraftProtection } from './shared/confirm';
import {
  restoreCaret,
  rememberCaret,
  createDocIntent,
  hasDocChanges,
  clearsPrivateDraft,
} from './docs-editor';
import { confirmDialog, discardDraft } from './shared/confirm-bus';
import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { z } from 'zod';
import { apiClient, ApiError, type Self } from './api';
import type { Project } from './workspace-api';
import { Dialog, EmptyState, ErrorNotice, Loading, Toast } from './shared/components';
import { docSnippets } from './doc-snippets';
const client = apiClient();
const id = z.number().int().min(1),
  timestamp = z.string().datetime(),
  person = z.object({ id, display_name: z.string().min(1).max(100), active: z.boolean() }).strict();
const base = {
  id,
  project_id: id,
  title: z.string().min(1).max(200),
  version: id,
  created_by: person,
  updated_by: person,
  created_at: timestamp,
  updated_at: timestamp,
  deleted_at: timestamp.nullable(),
  text_length: z.number().int().min(0).max(200000),
  can_edit: z.boolean(),
  can_delete: z.boolean(),
  can_restore: z.boolean(),
};
const summary = z.object(base).strict();
const docSchema = z.object({ ...base, body_html: z.string().max(1000000) }).strict();
const docsPage = z.object({ items: z.array(summary).max(1000) }).strict();
const docItem = z.object({ item: docSchema }).strict();
const versions = z
  .object({
    items: z
      .array(
        z
          .object({
            version: id,
            title: z.string(),
            body_html: z.string(),
            edited_by: person,
            edited_at: timestamp,
          })
          .strict(),
      )
      .max(1000),
  })
  .strict();
const imageFiles = z
  .object({
    items: z
      .array(
        z
          .object({
            original_name: z.string().min(1).max(200),
            validated_type: z.string().min(1).max(100),
            deleted_at: z.string().nullable(),
            download_path: z
              .string()
              .regex(/^\/api\/(project-files|attachments)\/[0-9]+\/download$/),
          })
          .passthrough(),
      )
      .max(100),
  })
  .passthrough();
type Doc = z.infer<typeof docSchema>;
type Summary = z.infer<typeof summary>;
const tools: [string, string, string?][] = [
  ['H1', 'formatBlock', 'h1'],
  ['H2', 'formatBlock', 'h2'],
  ['H3', 'formatBlock', 'h3'],
  ['Bold', 'bold'],
  ['Italic', 'italic'],
  ['• List', 'insertUnorderedList'],
  ['1. List', 'insertOrderedList'],
  ['Code', 'formatBlock', 'pre'],
  ['Quote', 'formatBlock', 'blockquote'],
];

/**
 * FR-48 Docs. HTML shown here always comes back from the server sanitizer (SRS §9.7);
 * the editor is a plain contentEditable with no external scripts or CDN.
 */
export function ProjectDocs({
  project,
  self,
  online,
  onFailure,
}: {
  project: Project;
  self: Self;
  online: boolean;
  onFailure: (e: ApiError) => void;
}) {
  const [items, setItems] = useState<Summary[]>(),
    [trash, setTrash] = useState(false),
    [selected, setSelected] = useState<Doc>(),
    [editing, setEditing] = useState(false),
    [creating, setCreating] = useState(false),
    [newTitle, setNewTitle] = useState(''),
    [unknownCreate, setUnknownCreate] = useState(false),
    [bodyChanged, setBodyChanged] = useState(false),
    [title, setTitle] = useState(''),
    [pending, setPending] = useState(false),
    [conflict, setConflict] = useState(false),
    [error, setError] = useState<ApiError>(),
    [notice, setNotice] = useState(''),
    [history, setHistory] = useState<z.infer<typeof versions>['items']>(),
    [images, setImages] = useState<z.infer<typeof imageFiles>['items']>(),
    [pendingImage, setPendingImage] = useState<{ path: string; name: string }>(),
    [reload, setReload] = useState(0);
  const editor = useRef<HTMLDivElement>(null),
    readerHeading = useRef<HTMLHeadingElement>(null),
    createIntent = useRef<{ key: string; title: string }>(undefined),
    insertAt = useRef<Range>(undefined),
    busy = useRef(false),
    privateEpoch = useRef(0),
    composing = useRef(false);
  const dirty =
    (editing && !!selected && (title !== selected.title || bodyChanged)) ||
    (creating && (!!newTitle || unknownCreate)) ||
    pending;
  const mayLeave = async () => {
    if (busy.current) return false;
    const range = rememberCaret(editor.current);
    if (!dirty || (await discardDraft())) return true;
    // Dialog releases its focus trap on the next frame. Restore the live editor and caret.
    requestAnimationFrame(() => requestAnimationFrame(() => restoreCaret(editor.current, range)));
    return false;
  };
  const writable =
    project.effective_access !== 'viewer' && !project.archived_at && !self.maintenance;
  const fail = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError) {
        setError(e);
        setNotice('');
        if (clearsPrivateDraft(e.status)) {
          privateEpoch.current++;
          if (editor.current) editor.current.replaceChildren();
          setSelected(undefined);
          setItems([]);
          setTitle('');
          setNewTitle('');
          setEditing(false);
          setCreating(false);
          setBodyChanged(false);
          setUnknownCreate(false);
          setHistory(undefined);
          setImages(undefined);
          setPendingImage(undefined);
          insertAt.current = undefined;
          createIntent.current = undefined;
        }
        if (e.kind === 'conflict') setConflict(true);
        onFailure(e);
      } else {
        setError(new ApiError('request', 0));
        setNotice('');
      }
    },
    [onFailure],
  );
  useEffect(() => {
    const c = new AbortController();
    const epoch = privateEpoch.current;
    client
      .request(`/api/projects/${project.id}/docs?includeDeleted=${trash}`, {
        signal: c.signal,
        parse: (v) => docsPage.parse(v).items,
      })
      .then((v) => !c.signal.aborted && epoch === privateEpoch.current && setItems(v))
      .catch((e) => !c.signal.aborted && fail(e));
    return () => c.abort();
  }, [project.id, trash, reload, fail]);
  const open = async (docId: number) => {
    if (!(await mayLeave())) return;
    const epoch = privateEpoch.current;
    try {
      const d = await client.request(`/api/docs/${docId}`, { parse: (v) => docItem.parse(v).item });
      if (epoch !== privateEpoch.current) return;
      setSelected(d);
      setTitle(d.title);
      setEditing(false);
      setBodyChanged(false);
      setError(undefined);
      setConflict(false);
      setHistory(undefined);
      setNotice('');
    } catch (e) {
      fail(e);
    }
  };
  const save = async () => {
    if (!selected || busy.current || !online || !writable || !title.trim()) return;
    busy.current = true;
    const epoch = privateEpoch.current;
    const caret = rememberCaret(editor.current);
    setNotice('');
    setPending(true);
    try {
      const d = await client.request(`/api/docs/${selected.id}`, {
        method: 'PATCH',
        csrf: self.csrf,
        body: {
          title: title.trim(),
          body_html: editor.current?.innerHTML ?? '',
          version: selected.version,
        },
        parse: (v) => docItem.parse(v).item,
      });
      if (epoch !== privateEpoch.current) return;
      setSelected(d);
      setTitle(d.title);
      setEditing(false);
      setBodyChanged(false);
      setError(undefined);
      setConflict(false);
      setNotice('Doc saved');
      setReload((n) => n + 1);
    } catch (e) {
      fail(e);
      requestAnimationFrame(() => restoreCaret(editor.current, caret));
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  const create = async () => {
    if (busy.current || !online || !writable || !newTitle.trim() || composing.current) return;
    busy.current = true;
    setPending(true);
    setNotice('');
    const epoch = privateEpoch.current;
    // An uncertain acknowledgement MUST replay the same key AND payload.
    const intent = createDocIntent(newTitle, createIntent.current);
    if (!intent) {
      busy.current = false;
      setPending(false);
      return;
    }
    createIntent.current = intent;
    try {
      const d = await client.request(`/api/projects/${project.id}/docs`, {
        method: 'POST',
        csrf: self.csrf,
        key: intent.key,
        body: { title: intent.title, body_html: '<p></p>' },
        parse: (v) => docItem.parse(v).item,
      });
      if (epoch !== privateEpoch.current) return;
      createIntent.current = undefined;
      setUnknownCreate(false);
      setCreating(false);
      setNewTitle('');
      setError(undefined);
      setConflict(false);
      setSelected(d);
      setTitle(d.title);
      setBodyChanged(false);
      setEditing(true);
      setReload((n) => n + 1);
    } catch (e) {
      // Transport failures are wrapped as ApiError(status=0); invalid success
      // responses also cannot prove that the server did not commit the create.
      const uncertain =
        !(e instanceof ApiError) || e.status === 0 || e.status >= 500 || e.kind === 'invalid';
      setUnknownCreate(uncertain);
      if (!uncertain) createIntent.current = undefined;
      fail(e);
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  const beginCreate = async () => {
    if (!(await mayLeave())) return;
    setEditing(false);
    setBodyChanged(false);
    setNewTitle('');
    createIntent.current = undefined;
    setUnknownCreate(false);
    setError(undefined);
    setNotice('');
    setCreating(true);
  };
  const closeCreate = async () => {
    if (!(await mayLeave())) return;
    setCreating(false);
    setNewTitle('');
    setUnknownCreate(false);
    createIntent.current = undefined;
  };
  const lifecycle = async (restore: boolean) => {
    if (!selected || busy.current) return;
    if (
      !restore &&
      !(await confirmDialog({
        title: 'Move doc to trash?',
        message: `“${selected.title}” can be restored for 30 days.`,
        confirmLabel: 'Move to trash',
        danger: true,
      }))
    )
      return;
    busy.current = true;
    const epoch = privateEpoch.current;
    setPending(true);
    try {
      const d = await client.request(`/api/docs/${selected.id}${restore ? '/restore' : ''}`, {
        method: restore ? 'POST' : 'DELETE',
        csrf: self.csrf,
        body: { version: selected.version },
        parse: (v) => docItem.parse(v).item,
      });
      if (epoch !== privateEpoch.current) return;
      setSelected(restore ? d : undefined);
      setError(undefined);
      setNotice(restore ? 'Doc restored' : 'Doc moved to trash');
      setReload((n) => n + 1);
    } catch (e) {
      fail(e);
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  const command = useCallback(
    (cmd: string, value?: string) => {
      editor.current?.focus();
      // execCommand is deprecated but dependency-free; the server sanitizer is the real boundary.
      document.execCommand(cmd, false, value);
      setBodyChanged(
        !!selected && hasDocChanges(selected, selected.title, editor.current?.innerHTML ?? ''),
      );
    },
    [selected],
  );
  const pickImage = async () => {
    const sel = window.getSelection();
    insertAt.current =
      sel?.rangeCount && editor.current?.contains(sel.anchorNode)
        ? sel.getRangeAt(0).cloneRange()
        : undefined;
    const epoch = privateEpoch.current;
    try {
      const page = await client.request(`/api/projects/${project.id}/files?pageSize=100`, {
        parse: (v) => imageFiles.parse(v).items,
      });
      if (epoch !== privateEpoch.current) return;
      setImages(page.filter((f) => !f.deleted_at && /^image\//.test(f.validated_type)));
    } catch (e) {
      fail(e);
    }
  };
  // Insert only after the modal picker has closed and released focus back to the page;
  // while it is open the editor is inert and execCommand would silently do nothing.
  useEffect(() => {
    if (!pendingImage || images) return;
    const timer = setTimeout(() => {
      editor.current?.focus();
      const sel = window.getSelection();
      if (insertAt.current && sel) {
        sel.removeAllRanges();
        sel.addRange(insertAt.current);
      }
      command('insertHTML', docSnippets.image(pendingImage.path, pendingImage.name));
      setPendingImage(undefined);
    });
    return () => clearTimeout(timer);
  }, [pendingImage, images, command]);
  useEffect(() => {
    const timer = setTimeout(() => {
      (editing ? editor.current : readerHeading.current)?.focus({ preventScroll: true });
    }, 50);
    return () => clearTimeout(timer);
  }, [editing, selected?.id]);
  const insertImage = (path: string, name: string) => {
    setPendingImage({ path, name });
    setImages(undefined);
  };
  /** Checklist items toggle when the box (left gutter) is clicked while editing. */
  const toggleCheck = (e: MouseEvent<HTMLDivElement>) => {
    if (!editing || pending) return;
    const li = (e.target as HTMLElement).closest('ul[data-type="checklist"] > li');
    if (!(li instanceof HTMLElement)) return;
    if (e.clientX - li.getBoundingClientRect().left > 24) return;
    e.preventDefault();
    li.dataset.checked = li.dataset.checked === 'true' ? 'false' : 'true';
    setBodyChanged(
      !!selected && hasDocChanges(selected, selected.title, editor.current?.innerHTML ?? ''),
    );
  };
  return (
    <div className="project-docs">
      {dirty && <DraftProtection />}
      <aside className="docs-list" aria-label="Docs">
        <div className="toolbar">
          {writable && (
            <button
              className="primary"
              disabled={!online || pending}
              onClick={() => void beginCreate()}
            >
              + New doc
            </button>
          )}
          <label>
            <input type="checkbox" checked={trash} onChange={(e) => setTrash(e.target.checked)} />{' '}
            Show trash
          </label>
        </div>
        {!items ? (
          <Loading />
        ) : items.length ? (
          <ul>
            {items.map((d) => (
              <li key={d.id}>
                <button aria-current={selected?.id === d.id} onClick={() => void open(d.id)}>
                  {d.title}
                  <small>
                    {d.deleted_at ? 'In trash · ' : ''}
                    {d.updated_by.display_name} · v{d.version}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No docs yet">
            {writable && <p>Create a doc for specs, notes or meeting minutes.</p>}
          </EmptyState>
        )}
      </aside>
      <article className="doc-view" aria-live="polite">
        {notice && <Toast>{notice}</Toast>}
        {error && <ErrorNotice error={error} />}
        {conflict && selected && (
          <p role="alert">
            Someone saved a newer version. Your text is still in the editor; copy it, then{' '}
            <button onClick={() => void open(selected.id)}>load the latest version</button>.
          </p>
        )}
        {!selected ? (
          !!items?.length && <EmptyState title="Select a doc" />
        ) : (
          <>
            <header className="doc-head">
              {editing ? (
                <input
                  aria-label="Doc title"
                  maxLength={200}
                  disabled={pending}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              ) : (
                <h2 ref={readerHeading} tabIndex={-1}>
                  {selected.title}
                </h2>
              )}
              <small>
                v{selected.version} · {selected.updated_by.display_name} ·{' '}
                {new Date(selected.updated_at).toLocaleString('en-GB', {
                  timeZone: 'Asia/Bangkok',
                })}
              </small>
              <div className="toolbar">
                {selected.can_edit && !editing && (
                  <button
                    className="primary"
                    disabled={!online || !writable}
                    onClick={() => {
                      setNotice('');
                      setEditing(true);
                    }}
                  >
                    Edit
                  </button>
                )}
                {editing && (
                  <>
                    <button
                      className="primary"
                      disabled={!online || !writable || pending || conflict || !title.trim()}
                      onClick={() => void save()}
                    >
                      {pending ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      className="permission-cancel"
                      disabled={pending}
                      onClick={() => {
                        void open(selected.id);
                      }}
                    >
                      Cancel
                    </button>
                  </>
                )}
                {selected.can_delete && !editing && (
                  <button
                    className="danger"
                    disabled={!online || pending}
                    onClick={() => void lifecycle(false)}
                  >
                    Delete
                  </button>
                )}
                {selected.can_restore && (
                  <button disabled={!online || pending} onClick={() => void lifecycle(true)}>
                    Restore
                  </button>
                )}
                <button
                  onClick={() => {
                    const epoch = privateEpoch.current;
                    void client
                      .request(`/api/docs/${selected.id}/versions`, {
                        parse: (v) => versions.parse(v).items,
                      })
                      .then((value) => {
                        if (epoch === privateEpoch.current) setHistory(value);
                      })
                      .catch(fail);
                  }}
                >
                  History
                </button>
              </div>
            </header>
            {editing && (
              <div className="toolbar doc-tools" role="toolbar" aria-label="Formatting">
                {tools.map(([label, cmd, value]) => (
                  <button
                    key={label}
                    type="button"
                    disabled={pending}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => command(cmd, value)}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={pending}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => command('insertHTML', docSnippets.checklist)}
                >
                  ☐ Checklist
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => command('insertHTML', docSnippets.table)}
                >
                  Table
                </button>
                <button
                  type="button"
                  disabled={!online || pending}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void pickImage()}
                >
                  Image
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const url = window.prompt('Link (https:// or mailto:)');
                    if (url && /^(https?:\/\/|mailto:)/i.test(url.trim()))
                      command('createLink', url.trim());
                  }}
                >
                  Link
                </button>
              </div>
            )}
            <div
              key={`${selected.id}:${selected.version}:${editing}`}
              ref={editor}
              className={`doc-body ${editing ? 'editing' : ''}`}
              contentEditable={editing && !pending}
              suppressContentEditableWarning
              role={editing ? 'textbox' : undefined}
              aria-multiline={editing || undefined}
              aria-label={editing ? 'Doc content' : undefined}
              onInput={() =>
                setBodyChanged(
                  hasDocChanges(selected, selected.title, editor.current?.innerHTML ?? ''),
                )
              }
              onMouseDown={toggleCheck}
              // Server-sanitized allowlist HTML only (SRS §9.7); never raw user input.
              dangerouslySetInnerHTML={{ __html: selected.body_html }}
            />
          </>
        )}
      </article>
      {creating && (
        <Dialog title="New doc" onClose={() => void closeCreate()}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
          >
            <label>
              Doc title
              <input
                data-autofocus
                aria-label="Doc title"
                maxLength={200}
                value={newTitle}
                disabled={pending || unknownCreate}
                onCompositionStart={() => {
                  composing.current = true;
                }}
                onCompositionEnd={() => {
                  composing.current = false;
                }}
                onChange={(event) => setNewTitle(event.target.value)}
              />
            </label>
            {error && <ErrorNotice error={error} />}
            {unknownCreate && (
              <p>The result is unconfirmed. Retry the same request to recover this doc.</p>
            )}
            <button type="button" disabled={pending} onClick={() => void closeCreate()}>
              Cancel
            </button>
            <button
              type="submit"
              className="primary"
              disabled={pending || !newTitle.trim() || !online || !writable}
            >
              {pending ? 'Creating…' : unknownCreate ? 'Retry create' : 'Create'}
            </button>
          </form>
        </Dialog>
      )}
      {images && (
        <Dialog title="Insert image from project files" onClose={() => setImages(undefined)}>
          {images.length ? (
            <ul className="doc-image-picker">
              {images.map((f) => (
                <li key={f.download_path}>
                  <button onClick={() => insertImage(f.download_path, f.original_name)}>
                    {f.original_name}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No images in this project's Files yet" />
          )}
        </Dialog>
      )}
      {history && (
        <Dialog title="Doc history" onClose={() => setHistory(undefined)}>
          <ol className="doc-history">
            {history.map((h) => (
              <li key={h.version}>
                v{h.version} · {h.title} · {h.edited_by.display_name} ·{' '}
                {new Date(h.edited_at).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' })}
              </li>
            ))}
          </ol>
        </Dialog>
      )}
    </div>
  );
}
