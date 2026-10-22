import { apiRequest } from './client';
import type { LoginData } from './types';

/** POST /auth/login → { token, user }. Sai thông tin → ApiError(status 401). */
export function login(username: string, password: string): Promise<LoginData> {
  return apiRequest<LoginData>('/auth/login', {
    method: 'POST',
    body: { username, password },
  });
}
