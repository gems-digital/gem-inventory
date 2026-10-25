import { apiRequest } from './client';
import type { LoginData } from './types';

/** POST /auth/login → { token, user }. Sai thông tin → ApiError(status 401). */
export function login(username: string, password: string): Promise<LoginData> {
  return apiRequest<LoginData>('/auth/login', {
    method: 'POST',
    body: { username, password },
  });
}

/** PATCH /auth/password → 204. MK hiện tại sai → ApiError(status 400). */
export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return apiRequest<void>('/auth/password', {
    method: 'PATCH',
    body: { currentPassword, newPassword },
    auth: true,
  });
}
