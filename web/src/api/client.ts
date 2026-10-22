import type { ApiEnvelope } from './types';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

const TOKEN_KEY = 'omnigem.token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* localStorage có thể không dùng được (private mode) — bỏ qua. */
  }
}

/** Lỗi API chuẩn hoá: giữ status để xử lý 401 ở lớp trên. */
export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Phát khi gặp 401 để AuthContext đăng xuất + điều hướng về /login. */
export type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
}

/**
 * Gọi API, mở envelope, trả data. Gắn Bearer khi auth=true. 401 → gọi handler
 * (đăng xuất) rồi throw. Thông báo lỗi tiếng Việt, thân thiện người dùng.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false, signal } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.', 0);
  }

  if (response.status === 401) {
    if (onUnauthorized) onUnauthorized();
  }

  let envelope: ApiEnvelope<T> | null = null;
  try {
    envelope = (await response.json()) as ApiEnvelope<T>;
  } catch {
    envelope = null;
  }

  if (!response.ok || !envelope || envelope.success !== true) {
    const message =
      envelope?.error ??
      (response.status === 401
        ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        : 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    throw new ApiError(message, response.status);
  }

  return envelope.data as T;
}

export { BASE_URL };
