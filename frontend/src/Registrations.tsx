import { useEffect, useRef, useState } from 'react';
import { apiClient, ApiError, type Self } from './api';
import { registrationSchema, registrationsPage, type Registration } from './registration-api';
import { failureMessage } from './auth-policy';
import { DataTable, Dialog, EmptyState, Loading, Toast } from './shared/components';
const client = apiClient();
export function Registrations({
  self,
  online,
  onFailure,
  onSelfChange,
}: {
  self: Self;
  online: boolean;
  onFailure: (e: ApiError) => void;
  onSelfChange: () => void;
}) {
  const [data, setData] = useState<ReturnType<typeof registrationsPage.parse>>(),
    [status, setStatus] = useState('pending'),
    [page, setPage] = useState(1),
    [reload, setReload] = useState(0),
    [failure, setFailure] = useState(''),
    [notice, setNotice] = useState(''),
    [pending, setPending] = useState(false),
    [review, setReview] = useState<{
      item: Registration;
      decision: 'approve' | 'reject';
      key: string;
    }>();
  const busy = useRef(false);
  useEffect(() => {
    const c = new AbortController();
    void client
      .request(`/api/registrations?status=${status}&page=${page}&pageSize=20`, {
        signal: c.signal,
        parse: (v) => registrationsPage.parse(v),
      })
      .then((v) => {
        if (c.signal.aborted) return;
        setData(v);
        setFailure('');
      })
      .catch((e: unknown) => {
        if (c.signal.aborted) return;
        setFailure(failureMessage(e));
        if (e instanceof ApiError) onFailure(e);
      });
    return () => c.abort();
  }, [status, page, reload, self.view_revision, onFailure]);
  const disabled = !online || self.maintenance || pending;
  return (
    <section>
      <h3>Registrations</h3>
      <p className="hint">
        Confirm the applicant belongs to your organization; email ownership is not verified.
        Approval allows sign-in; assign team and project access in Members.
      </p>
      {failure && <p role="alert">{failure}</p>}
      {notice && <Toast>{notice}</Toast>}
      <div className="toolbar">
        <label>
          Status{' '}
          <select
            aria-label="Registration status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </label>
        <button disabled={disabled} onClick={() => setReload((v) => v + 1)}>
          Refresh registrations
        </button>
      </div>
      {!data ? (
        failure ? null : (
          <Loading />
        )
      ) : !data.items.length ? (
        <EmptyState title="No registrations" />
      ) : (
        <>
          <DataTable
            caption="Registration requests"
            columns={['Member', 'Sign-in email', 'Status', 'Review']}
            rows={data.items.map((item) => [
              item.display_name,
              item.email,
              item.status,
              item.status === 'pending' ? (
                <div className="toolbar" key={item.id}>
                  <button
                    disabled={disabled}
                    onClick={() => {
                      setFailure('');
                      setReview({ item, decision: 'approve', key: crypto.randomUUID() });
                    }}
                  >
                    Approve {item.display_name}
                  </button>
                  <button
                    disabled={disabled}
                    onClick={() => {
                      setFailure('');
                      setReview({ item, decision: 'reject', key: crypto.randomUUID() });
                    }}
                  >
                    Reject {item.display_name}
                  </button>
                </div>
              ) : (
                'Reviewed'
              ),
            ])}
          />
          <div className="toolbar">
            <button disabled={page === 1} onClick={() => setPage((v) => v - 1)}>
              Previous registrations
            </button>
            <span>
              Page {page} · {data.total} requests
            </span>
            <button
              disabled={page * data.pageSize >= data.total}
              onClick={() => setPage((v) => v + 1)}
            >
              Next registrations
            </button>
          </div>
        </>
      )}
      {review && (
        <Dialog
          title={review.decision === 'approve' ? 'Approve registration' : 'Reject registration'}
          onClose={() => {
            if (!pending) setReview(undefined);
          }}
        >
          <p>
            {review.item.display_name} — {review.item.email}
          </p>
          <p>
            {review.decision === 'approve'
              ? 'Allow this member to sign in. Team and project access must be assigned separately.'
              : 'This account will remain unable to sign in.'}
          </p>
          <button
            disabled={disabled}
            onClick={() => {
              if (busy.current) return;
              busy.current = true;
              setPending(true);
              setFailure('');
              void client
                .request(`/api/registrations/${review.item.id}/${review.decision}`, {
                  method: 'POST',
                  csrf: self.csrf,
                  key: review.key,
                  body: { version: review.item.version },
                  parse: (v) => registrationSchema.parse((v as { item: unknown }).item),
                })
                .then(() => {
                  setNotice(
                    review.decision === 'approve'
                      ? 'Registration approved'
                      : 'Registration rejected',
                  );
                  setReview(undefined);
                  setPage(1);
                  setReload((v) => v + 1);
                  onSelfChange();
                })
                .catch((e: unknown) => {
                  setFailure(failureMessage(e));
                  if (e instanceof ApiError) {
                    onFailure(e);
                    if (e.code === 'VERSION_CONFLICT') {
                      setReview(undefined);
                      setReload((v) => v + 1);
                    }
                  }
                })
                .finally(() => {
                  busy.current = false;
                  setPending(false);
                });
            }}
          >
            {pending ? 'Saving…' : 'Confirm ' + review.decision}
          </button>
          <button disabled={pending} onClick={() => setReview(undefined)}>
            Cancel
          </button>
        </Dialog>
      )}
    </section>
  );
}
