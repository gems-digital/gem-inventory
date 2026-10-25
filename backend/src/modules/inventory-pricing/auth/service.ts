import type { AuthRepository } from './repository.js';
import { verifyPassword, hashPassword } from './password.js';
import { signToken } from './jwt.js';
import type { PublicUser, UserListItem } from './types.js';

export class InvalidCredentialsError extends Error {
  constructor() {
    // Thông báo chung, không lộ username/password sai cái nào (BUILD.md §auth).
    super('Sai tên đăng nhập hoặc mật khẩu');
  }
}

export class InvalidPasswordError extends Error {
  constructor() {
    // Lỗi chung khi MK hiện tại sai, không lộ chi tiết (spec D5).
    super('Mật khẩu hiện tại không đúng');
  }
}

export class UserNotFoundError extends Error {
  constructor() {
    super('Không tìm thấy người dùng');
  }
}

function toPublicUser(user: { id: string; username: string; role: 'staff' | 'admin' }): PublicUser {
  return { id: user.id, username: user.username, role: user.role };
}

export function createAuthService(repository: AuthRepository) {
  return {
    async login(username: string, password: string): Promise<{ token: string; user: PublicUser }> {
      const user = await repository.findByUsername(username);
      if (!user) {
        throw new InvalidCredentialsError();
      }

      const passwordOk = await verifyPassword(user.passwordHash, password);
      if (!passwordOk) {
        throw new InvalidCredentialsError();
      }

      const token = signToken({ sub: user.id, username: user.username, role: user.role });
      return { token, user: toPublicUser(user) };
    },

    /**
     * Đổi MK tự phục vụ (user đang đăng nhập): verify MK hiện tại rồi hash+update MK mới.
     * MK hiện tại sai → InvalidPasswordError (route trả 400, spec §3).
     */
    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
      const user = await repository.findById(userId);
      if (!user) {
        throw new UserNotFoundError();
      }

      const currentOk = await verifyPassword(user.passwordHash, currentPassword);
      if (!currentOk) {
        throw new InvalidPasswordError();
      }

      const newHash = await hashPassword(newPassword);
      await repository.updatePasswordHash(user.id, newHash);
    },

    /**
     * Owner (admin) reset MK cho user khác — không cần MK cũ (spec D2).
     * user không tồn tại → UserNotFoundError (route trả 404).
     */
    async resetPassword(targetUserId: string, newPassword: string): Promise<void> {
      const user = await repository.findById(targetUserId);
      if (!user) {
        throw new UserNotFoundError();
      }

      const newHash = await hashPassword(newPassword);
      await repository.updatePasswordHash(user.id, newHash);
    },

    /**
     * Danh sách user cho admin (id, username, role, createdAt) — KHÔNG trả hash.
     */
    async listUsers(): Promise<UserListItem[]> {
      return repository.listUsers();
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
