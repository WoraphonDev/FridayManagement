import { confirmDialog } from './shared/confirm-bus';

// UI drafts only: deliberately separate from API schemas, payloads and storage.
export const emptyProjectDelivery = () => ({
  mode: '',
  objective: '',
  inScope: '',
  outScope: '',
  criteria: '',
  lead: '',
  acceptor: '',
  start: '',
  target: '',
  review: '',
});
export type ProjectDeliveryDraft = ReturnType<typeof emptyProjectDelivery>;
export const hasProjectDeliveryDraft = (value: ProjectDeliveryDraft) =>
  Object.values(value).some((field) => field !== '');

export function confirmPreviewDiscard() {
  return confirmDialog({
    title: 'Save existing fields only?',
    message:
      'Delivery setup and primary owner are UI previews. Their draft values will be discarded, not saved. Existing fields will be saved to the server.',
    confirmLabel: 'Discard preview and save',
    danger: true,
  });
}
