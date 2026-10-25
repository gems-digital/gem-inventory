import './ConfirmDialog.css';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  cancelLabel?: string;
  confirmLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Dialog xác nhận dựng tại chỗ (không dùng window.confirm) — dùng cho hành động nguy hiểm. */
export function ConfirmDialog({
  open,
  title,
  message,
  cancelLabel = 'Huỷ',
  confirmLabel,
  busy,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="confirm-overlay" role="presentation" onClick={onCancel}>
      <div
        className="confirm-sheet"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="confirm-sheet__title">
          {title}
        </h2>
        <p id="confirm-message" className="confirm-sheet__msg">
          {message}
        </p>
        <div className="confirm-sheet__actions">
          <button type="button" className="confirm-btn confirm-btn--cancel" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button type="button" className="confirm-btn confirm-btn--danger" onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
