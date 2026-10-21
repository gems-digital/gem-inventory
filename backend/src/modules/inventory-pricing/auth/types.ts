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

export interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole;
}
