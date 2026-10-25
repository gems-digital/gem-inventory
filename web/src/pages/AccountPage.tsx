import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PublicUser } from '../api/types';
import { changePassword } from '../api/auth';
import { listUsers, resetUserPassword } from '../api/users';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { BackIcon, PersonIcon } from '../components/icons';
import { Spinner } from '../components/Spinner';
import { Snackbar } from '../components/Snackbar';
import { roleLabel } from '../lib/labels';
import '../components/FormFields.css';
import '../components/ConfirmDialog.css';
import './AccountPage.css';

const MIN_PASSWORD_LEN = 8;

/** Lỗi chung khi MK mới quá ngắn hoặc nhập lại không khớp — kiểm tra trước khi gọi API. */
function validateNewPassword(newPassword: string, confirmPassword: string): string | null {
  if (newPassword.length < MIN_PASSWORD_LEN) return `Mật khẩu mới cần ít nhất ${MIN_PASSWORD_LEN} ký tự`;
  if (newPassword !== confirmPassword) return 'Mật khẩu nhập lại không khớp';
  return null;
}

export function AccountPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [toast, setToast] = useState<{ message: string; tone?: 'default' | 'danger' } | null>(null);

  return (
    <div className="account">
      <header className="topbar safe-top">
        <button type="button" className="topbar__btn" onClick={() => navigate('/list')} aria-label="Quay lại">
          <BackIcon size={22} />
        </button>
        <h1 className="topbar__title">Tài khoản</h1>
        <span className="topbar__spacer" />
      </header>

      <main className="account__body">
        {user && (
          <section className="card-surface account__user">
            <span className="account__user-avatar" aria-hidden="true">
              <PersonIcon size={24} />
            </span>
            <div className="account__user-info">
              <span className="account__user-name">{user.username}</span>
              <span className="account__user-role">{roleLabel(user.role)}</span>
            </div>
          </section>
        )}

        <ChangePasswordForm onSuccess={() => setToast({ message: 'Đã đổi mật khẩu' })} />

        {user?.role === 'admin' && (
          <UsersSection
            currentUserId={user.id}
            onResetSuccess={(username) => setToast({ message: `Đã đặt lại mật khẩu cho ${username}` })}
            onError={(message) => setToast({ message, tone: 'danger' })}
          />
        )}

        <button type="button" className="account__signout" onClick={signOut}>
          Đăng xuất
        </button>
      </main>

      {toast && (
        <Snackbar
          key={toast.message}
          message={toast.message}
          tone={toast.tone}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}

function ChangePasswordForm({ onSuccess }: { onSuccess: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;

    const confirmError = validateNewPassword(newPassword, confirmPassword);
    if (confirmError) {
      setFieldErrors({ confirmPassword: confirmError });
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setFieldErrors({ currentPassword: err.message });
      } else {
        setFieldErrors({
          confirmPassword: err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="card-surface account__section">
      <h2 className="account__section-title">Đổi mật khẩu</h2>
      <form className="account__form" onSubmit={handleSubmit} noValidate>
        <PasswordField
          label="Mật khẩu hiện tại"
          value={currentPassword}
          onChange={setCurrentPassword}
          error={fieldErrors.currentPassword}
        />
        <PasswordField label="Mật khẩu mới" value={newPassword} onChange={setNewPassword} />
        <PasswordField
          label="Nhập lại mật khẩu mới"
          value={confirmPassword}
          onChange={setConfirmPassword}
          error={fieldErrors.confirmPassword}
        />
        <button className="account__submit" type="submit" disabled={submitting}>
          {submitting ? <Spinner size={20} color="var(--ivory)" stroke={2} /> : 'Đổi mật khẩu'}
        </button>
      </form>
    </section>
  );
}

interface UsersSectionProps {
  currentUserId: string;
  onResetSuccess: (username: string) => void;
  onError: (message: string) => void;
}

function UsersSection({ currentUserId, onResetSuccess, onError }: UsersSectionProps) {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [resetTarget, setResetTarget] = useState<PublicUser | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await listUsers();
      setUsers(data);
      setStatus('ready');
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError ? err.message : 'Không tải được danh sách người dùng. Vui lòng thử lại.',
      );
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="card-surface account__section">
      <h2 className="account__section-title">Người dùng</h2>

      {status === 'loading' && (
        <div className="account__users-center">
          <Spinner />
        </div>
      )}

      {status === 'error' && (
        <div className="account__users-center account__users-error">
          <p className="account__users-msg">{errorMessage}</p>
          <button type="button" className="btn-retry" onClick={load}>
            Thử lại
          </button>
        </div>
      )}

      {status === 'ready' && (
        <ul className="account__users-list">
          {users.map((u) => (
            <li key={u.id} className="account__user-row">
              <div className="account__user-row-info">
                <span className="account__user-row-name">
                  {u.username}
                  {u.id === currentUserId && <span className="account__user-row-you"> (bạn)</span>}
                </span>
                <span className="account__user-row-role">{roleLabel(u.role)}</span>
              </div>
              <button
                type="button"
                className="account__reset-btn"
                onClick={() => setResetTarget(u)}
              >
                Đặt lại MK
              </button>
            </li>
          ))}
        </ul>
      )}

      <ResetPasswordDialog
        user={resetTarget}
        onClose={() => setResetTarget(null)}
        onSuccess={(username) => {
          setResetTarget(null);
          onResetSuccess(username);
        }}
        onError={onError}
      />
    </section>
  );
}

interface ResetPasswordDialogProps {
  user: PublicUser | null;
  onClose: () => void;
  onSuccess: (username: string) => void;
  onError: (message: string) => void;
}

function ResetPasswordDialog({ user, onClose, onSuccess, onError }: ResetPasswordDialogProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Xoá state mỗi khi đổi user mục tiêu (mở dialog mới).
  useEffect(() => {
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
  }, [user]);

  if (!user) return null;
  const target = user;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;

    const validationError = validateNewPassword(newPassword, confirmPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await resetUserPassword(target.id, newPassword);
      onSuccess(target.username);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        onError('Người dùng không còn tồn tại.');
        onClose();
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="confirm-overlay" role="presentation" onClick={onClose}>
      <div
        className="confirm-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-pw-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="reset-pw-title" className="confirm-sheet__title">
          Đặt lại mật khẩu cho {user.username}
        </h2>
        <p className="confirm-sheet__msg">
          Phiên đăng nhập hiện tại của {user.username} vẫn còn hiệu lực đến khi hết hạn; mật khẩu mới chỉ áp
          dụng từ lần đăng nhập sau.
        </p>
        <form onSubmit={handleSubmit} noValidate>
          <div className="account__form">
            <PasswordField label="Mật khẩu mới" value={newPassword} onChange={setNewPassword} />
            <PasswordField
              label="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={setConfirmPassword}
              error={error ?? undefined}
            />
          </div>
          <div className="confirm-sheet__actions">
            <button
              type="button"
              className="confirm-btn confirm-btn--cancel"
              onClick={onClose}
              disabled={submitting}
            >
              Huỷ
            </button>
            <button type="submit" className="confirm-btn confirm-btn--primary" disabled={submitting}>
              {submitting ? <Spinner size={18} color="var(--ivory)" stroke={2} /> : 'Đặt lại MK'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <label className="ff">
      <span className="ff__label">{label}</span>
      <span className={`ff__box ${error ? 'ff__box--error' : ''}`}>
        <input
          className="ff__input"
          type="password"
          autoComplete="new-password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </span>
      {error && <span className="ff__error">{error}</span>}
    </label>
  );
}
