import type { Pool } from 'pg';
import type { AppUser } from './types.js';

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  role: 'staff' | 'admin';
  created_at: string;
}

function toAppUser(row: UserRow): AppUser {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    role: row.role,
    createdAt: row.created_at,
  };
}

/**
 * Truy cập Postgres cho bảng app_user. Không chứa logic nghiệp vụ (xem service.ts).
 */
export function createAuthRepository(pool: Pool) {
  return {
    async findByUsername(username: string): Promise<AppUser | null> {
      const result = await pool.query<UserRow>(
        'SELECT id, username, password_hash, role, created_at FROM app_user WHERE username = $1',
        [username],
      );
      const row = result.rows[0];
      return row ? toAppUser(row) : null;
    },
  };
}

export type AuthRepository = ReturnType<typeof createAuthRepository>;
