import { useEffect } from 'react';
import './Snackbar.css';

interface SnackbarProps {
  message: string;
  tone?: 'default' | 'danger';
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  durationMs?: number;
}

/** Toast nổi đáy màn hình, tự ẩn sau durationMs. Hết giờ thì không làm gì thêm. */
export function Snackbar({
  message,
  tone = 'default',
  actionLabel,
  onAction,
  onDismiss,
  durationMs = 5000,
}: SnackbarProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(timer);
    // Chỉ chạy lại khi nội dung đổi (snackbar mới) — onDismiss là callback ổn định từ cha.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  return (
    <div className={`snackbar safe-bottom ${tone === 'danger' ? 'snackbar--danger' : ''}`} role="status">
      <span className="snackbar__msg">{message}</span>
      {actionLabel && onAction && (
        <button
          type="button"
          className="snackbar__action"
          onClick={() => {
            onAction();
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
