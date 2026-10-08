import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { apiClient, ApiError, type Self } from './api';
import type { Project } from './workspace-api';
import { Dialog, EmptyState, ErrorNotice, Loading, Toast } from './shared/components';
const client = apiClient();
const id = z.number().int().min(1),
  timestamp = z.string().datetime(),
  person = z.object({ id, display_name: z.string().min(1).max(100), active: z.boolean() }).strict();
const fileSchema = z
  .object({
    source: z.enum(['project', 'task']),
    id,
    project_id: id,
    task_id: id.nullable(),
    task_title: z.string().min(1).max(200).nullable(),
    uploader: person,
    original_name: z.string().min(1).max(200),
    bytes: z.number().int().min(1),
    validated_type: z.string().min(1).max(100),
    sha256: z.string().length(64),
    created_at: timestamp,
    deleted_at: timestamp.nullable(),
    download_path: z.string().regex(/^\/api\/(project-files|attachments)\/[0-9]+\/download$/),
    can_delete: z.boolean(),
    can_restore: z.boolean(),
  })
  .strict();
const filePage = z
  .object({
    items: z.array(fileSchema).max(100),
    page: id,
    pageSize: z.number().int(),
    total: z.number().int().min(0),
  })
  .strict();
const fileItem = z.object({ item: fileSchema }).strict();
type ProjectFile = z.infer<typeof fileSchema>;
const size = (b: number) =>
  b < 1024
    ? `${b} B`
    : b < 1048576
      ? `${(b / 1024).toFixed(1)} KB`
      : `${(b / 1048576).toFixed(1)} MB`;
const previewable = (t: string) =>
  ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(t);

/** FR-49 Files: project uploads + readable task attachments; quota/type checks stay server-side. */
export function ProjectFiles({
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
  const [data, setData] = useState<z.infer<typeof filePage>>(),
    [q, setQ] = useState(''),
    [query, setQuery] = useState(''),
    [type, setType] = useState(''),
    [source, setSource] = useState(''),
    [trash, setTrash] = useState(false),
    [page, setPage] = useState(1),
    [pending, setPending] = useState(false),
    [error, setError] = useState<ApiError>(),
    [notice, setNotice] = useState(''),
    [preview, setPreview] = useState<{ file: ProjectFile; url: string }>(),
    [reload, setReload] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const writable =
    project.effective_access !== 'viewer' && !project.archived_at && !self.maintenance;
  const fail = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError) {
        setError(e);
        onFailure(e);
      }
    },
    [onFailure],
  );
  // Search waits for a typing pause instead of issuing one request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(timer);
  }, [q]);
  useEffect(() => {
    const c = new AbortController();
    const params = new URLSearchParams({
      page: String(page),
      pageSize: '25',
      includeDeleted: String(trash),
    });
    if (query) params.set('q', query);
    if (type) params.set('type', type);
    if (source) params.set('source', source);
    client
      .request(`/api/projects/${project.id}/files?${params}`, {
        signal: c.signal,
        parse: (v) => filePage.parse(v),
      })
      .then((v) => {
        if (!c.signal.aborted) {
          setData(v);
          setError(undefined);
        }
      })
      .catch((e) => !c.signal.aborted && fail(e));
    return () => c.abort();
  }, [project.id, query, type, source, trash, page, reload, fail]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview.url), [preview]);
  const upload = async (file: File) => {
    setPending(true);
    setNotice('');
    try {
      const body = new FormData();
      body.append('file', file, file.name);
      await client.request(`/api/projects/${project.id}/files`, {
        method: 'POST',
        csrf: self.csrf,
        key: crypto.randomUUID(),
        body,
        parse: (v) => fileItem.parse(v),
      });
      setNotice(`Uploaded ${file.name}`);
      setReload((n) => n + 1);
    } catch (e) {
      fail(e);
    } finally {
      setPending(false);
      if (input.current) input.current.value = '';
    }
  };
  const blob = (f: ProjectFile) =>
    client.request(f.download_path, {
      binary: true,
      parse: (v) => {
        if (!(v instanceof Blob)) throw new Error('blob');
        return v;
      },
    });
  const show = async (f: ProjectFile) => {
    try {
      const b = await blob(f);
      // Re-type validated bytes so the browser renders only allowlisted image/PDF types.
      const url = URL.createObjectURL(new Blob([b], { type: f.validated_type }));
      if (f.validated_type === 'application/pdf') {
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else setPreview({ file: f, url });
    } catch (e) {
      fail(e);
    }
  };
  const save = async (f: ProjectFile) => {
    try {
      const url = URL.createObjectURL(await blob(f)),
        a = document.createElement('a');
      a.href = url;
      a.download = f.original_name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      fail(e);
    }
  };
  const change = async (f: ProjectFile, restore: boolean) => {
    if (!restore && !window.confirm(`Delete “${f.original_name}”? It can be restored for 30 days.`))
      return;
    setPending(true);
    try {
      const path =
        f.source === 'project'
          ? `/api/project-files/${f.id}${restore ? '/restore' : ''}`
          : `/api/attachments/${f.id}${restore ? '/restore' : ''}`;
      await client.request(path, {
        method: restore ? 'POST' : 'DELETE',
        csrf: self.csrf,
        parse: (v) => v,
      });
      setNotice(restore ? 'File restored' : 'File deleted');
      setReload((n) => n + 1);
    } catch (e) {
      fail(e);
    } finally {
      setPending(false);
    }
  };
  return (
    <section className="project-files" aria-label="Project files">
      {notice && <Toast>{notice}</Toast>}
      {error && <ErrorNotice error={error} />}
      <div className="toolbar">
        <input
          aria-label="Search files"
          placeholder="Search files"
          maxLength={100}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select
          aria-label="File type"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All types</option>
          <option value="image">Images</option>
          <option value="pdf">PDF</option>
          <option value="document">Documents</option>
          <option value="other">Other</option>
        </select>
        <select
          aria-label="File source"
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Project and tasks</option>
          <option value="project">Project files</option>
          <option value="task">Task attachments</option>
        </select>
        {writable && (
          <label>
            <input
              type="checkbox"
              checked={trash}
              onChange={(e) => {
                setTrash(e.target.checked);
                setPage(1);
              }}
            />{' '}
            Include deleted
          </label>
        )}
        {writable && (
          <>
            <input
              ref={input}
              type="file"
              hidden
              aria-label="Choose a file to upload"
              accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.csv,.zip,.docx,.xlsx,.pptx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
              }}
            />
            <button disabled={!online || pending} onClick={() => input.current?.click()}>
              {pending ? 'Uploading…' : '+ Upload file'}
            </button>
          </>
        )}
      </div>
      {!data ? (
        <Loading />
      ) : data.total === 0 ? (
        <EmptyState title="No files yet">
          {writable && <p>Upload a project file or attach files to tasks.</p>}
        </EmptyState>
      ) : (
        <div className="table-scroll" role="region" aria-label="Files" tabIndex={0}>
          <table>
            <caption>Files</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Size</th>
                <th scope="col">Uploaded by</th>
                <th scope="col">Uploaded</th>
                <th scope="col">From</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((f) => (
                <tr key={`${f.source}:${f.id}`} className={f.deleted_at ? 'deleted' : undefined}>
                  <th scope="row">
                    {f.original_name}
                    {f.deleted_at ? ' (deleted)' : ''}
                  </th>
                  <td>{size(f.bytes)}</td>
                  <td>{f.uploader.display_name}</td>
                  <td>
                    {new Date(f.created_at).toLocaleDateString('en-GB', {
                      timeZone: 'Asia/Bangkok',
                    })}
                  </td>
                  <td>{f.source === 'project' ? 'Project' : `Task: ${f.task_title}`}</td>
                  <td className="row-actions">
                    {!f.deleted_at && previewable(f.validated_type) && (
                      <button onClick={() => void show(f)}>Preview {f.original_name}</button>
                    )}
                    {!f.deleted_at && (
                      <button onClick={() => void save(f)}>Download {f.original_name}</button>
                    )}
                    {f.can_delete && (
                      <button disabled={!online || pending} onClick={() => void change(f, false)}>
                        Delete {f.original_name}
                      </button>
                    )}
                    {f.can_restore && (
                      <button disabled={!online || pending} onClick={() => void change(f, true)}>
                        Restore {f.original_name}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.total > data.pageSize && (
        <div className="toolbar">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous files page
          </button>
          <span>
            Page {page} · {data.total} files
          </span>
          <button disabled={page * data.pageSize >= data.total} onClick={() => setPage(page + 1)}>
            Next files page
          </button>
        </div>
      )}
      {preview && (
        <Dialog title={preview.file.original_name} onClose={() => setPreview(undefined)}>
          <img className="file-preview" src={preview.url} alt={preview.file.original_name} />
        </Dialog>
      )}
    </section>
  );
}
