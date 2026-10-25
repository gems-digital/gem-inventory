/**
 * Kiểu dùng chung cho module auth.
 */

export type UserRole = 'staff' | 'admin';

export interface AppUser {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  username: string;
  role: UserRole;
}

/**
 * User công khai cho danh sách quản trị (GET /users) — thêm createdAt, KHÔNG có hash.
 */
export interface UserListItem {
  id: string;
  username: string;
  role: UserRole;
  createdAt: string;
}

export interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole;
}
