import type { AuthRepository } from './repository.js';
import { verifyPassword } from './password.js';
import { signToken } from './jwt.js';
import type { PublicUser } from './types.js';

export class InvalidCredentialsError extends Error {
  constructor() {
    // Thông báo chung, không lộ username/password sai cái nào (BUILD.md §auth).
    super('Sai tên đăng nhập hoặc mật khẩu');
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
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
