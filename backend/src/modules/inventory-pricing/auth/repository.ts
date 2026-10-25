import type { Pool } from 'pg';
import type { AppUser, UserListItem } from './types.js';

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  role: 'staff' | 'admin';
  created_at: string;
}

// Hàng cho danh sách quản trị — KHÔNG chứa password_hash.
interface UserListRow {
  id: string;
  username: string;
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

function toUserListItem(row: UserListRow): UserListItem {
  return {
    id: row.id,
    username: row.username,
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

    async findById(id: string): Promise<AppUser | null> {
      const result = await pool.query<UserRow>(
        'SELECT id, username, password_hash, role, created_at FROM app_user WHERE id = $1',
        [id],
      );
      const row = result.rows[0];
      return row ? toAppUser(row) : null;
    },

    async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
      await pool.query('UPDATE app_user SET password_hash = $1 WHERE id = $2', [passwordHash, id]);
    },

    async listUsers(): Promise<UserListItem[]> {
      // KHÔNG select password_hash — danh sách này đi ra client admin.
      const result = await pool.query<UserListRow>(
        'SELECT id, username, role, created_at FROM app_user ORDER BY created_at',
      );
      return result.rows.map(toUserListItem);
    },
  };
}

export type AuthRepository = ReturnType<typeof createAuthRepository>;
