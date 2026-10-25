import { apiRequest } from './client';
import type { PublicUser } from './types';

/** GET /users (admin only) → PublicUser[]. */
export function listUsers(): Promise<PublicUser[]> {
  return apiRequest<PublicUser[]>('/users', {
    auth: true,
  });
}

/** PATCH /users/:id/password (admin only) → 204. User không tồn tại → ApiError(status 404). */
export function resetUserPassword(id: string, newPassword: string): Promise<void> {
  return apiRequest<void>(`/users/${encodeURIComponent(id)}/password`, {
    method: 'PATCH',
    body: { newPassword },
    auth: true,
  });
}
