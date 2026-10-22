import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { GemIcon, UserIcon, LockIcon } from '../components/icons';
import { Spinner } from '../components/Spinner';
import './LoginPage.css';

interface LocationState {
  from?: { pathname?: string };
}

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from?.pathname ?? '/list';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const data = await login(username.trim(), password);
      signIn(data);
      navigate(from, { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Đã có lỗi xảy ra. Vui lòng thử lại.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login">
      <header className="login__band safe-top">
        <div className="login__logo" aria-hidden="true">
          <GemIcon size={40} />
        </div>
        <h1 className="login__brand">OMNIGEM</h1>
        <p className="login__title">Kho &amp; Giá</p>
        <p className="login__subtitle">Sổ giá &amp; kho nội bộ — chỉ dành cho nhân viên</p>
      </header>

      <form className="login__form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span className="field__label">Tài khoản</span>
          <span className="field__box" data-error={error ? 'true' : undefined}>
            <UserIcon size={20} className="field__icon" />
            <input
              className="field__input"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={username}
              disabled={submitting}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Tên đăng nhập"
            />
          </span>
        </label>

        <label className="field">
          <span className="field__label">Mật khẩu</span>
          <span className="field__box" data-error={error ? 'true' : undefined}>
            <LockIcon size={20} className="field__icon" />
            <input
              className="field__input"
              type="password"
              autoComplete="current-password"
              value={password}
              disabled={submitting}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu"
            />
          </span>
        </label>

        {error && (
          <p className="login__error" role="alert">
            {error}
          </p>
        )}

        <button className="login__submit" type="submit" disabled={submitting}>
          {submitting ? <Spinner size={22} color="var(--ivory)" stroke={2} /> : 'Đăng nhập'}
        </button>

        <p className="login__footer">Phiên bản nội bộ · v0.1</p>
      </form>
    </div>
  );
}
