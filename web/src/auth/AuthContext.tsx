import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser, LoginData } from '../api/types';
import { getToken, setToken, setUnauthorizedHandler } from '../api/client';

const USER_KEY = 'omnigem.user';

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function writeStoredUser(user: AuthUser | null): void {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* bỏ qua lỗi storage */
  }
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  signIn: (data: LoginData) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Nguồn sự thật: token (localStorage) + user. Khởi tạo đồng bộ để guard
  // không chớp về /login khi reload (token còn trong storage).
  const [user, setUser] = useState<AuthUser | null>(() =>
    getToken() ? readStoredUser() : null,
  );

  const signIn = useCallback((data: LoginData) => {
    setToken(data.token);
    writeStoredUser(data.user);
    setUser(data.user);
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    writeStoredUser(null);
    setUser(null);
  }, []);

  // 401 từ bất kỳ request nào → đăng xuất (RequireAuth sẽ đưa về /login).
  useEffect(() => {
    setUnauthorizedHandler(() => signOut());
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: Boolean(user && getToken()), signIn, signOut }),
    [user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải dùng bên trong <AuthProvider>');
  return ctx;
}
