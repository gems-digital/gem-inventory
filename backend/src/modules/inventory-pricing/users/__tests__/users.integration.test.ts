import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../../../db/pool.js';
import { runMigrations } from '../../../../db/migrate.js';
import { hashPassword } from '../../auth/password.js';
import { registerAuthRoutes } from '../../auth/routes.js';
import { registerUsersRoutes } from '../routes.js';

/**
 * Integration test cho bề mặt users (admin): GET /users + PATCH /users/:id/password
 * (Owner reset MK, spec §3). Postgres thật (Docker). Seed 1 admin + 1 staff.
 */
describe('users routes (integration)', () => {
  let app: FastifyInstance;

  const adminUsername = 'users.integration.admin';
  const staffUsername = 'users.integration.staff';
  const password = 'correct-password-123';

  let adminToken: string;
  let staffToken: string;
  let staffId: string;

  async function login(username: string, pw: string) {
    return app.inject({ method: 'POST', url: '/auth/login', payload: { username, password: pw } });
  }

  async function seedUser(username: string, role: 'staff' | 'admin'): Promise<string> {
    const hash = await hashPassword(password);
    const result = await pool.query<{ id: string }>(
      `INSERT INTO app_user (username, password_hash, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
       RETURNING id`,
      [username, hash, role],
    );
    return result.rows[0]!.id;
  }

  beforeAll(async () => {
    await runMigrations();

    await seedUser(adminUsername, 'admin');
    staffId = await seedUser(staffUsername, 'staff');

    app = Fastify();
    await app.register(rateLimit, { global: false });
    await registerAuthRoutes(app, pool);
    await registerUsersRoutes(app, pool);
    await app.ready();

    adminToken = (await login(adminUsername, password)).json().data.token;
    staffToken = (await login(staffUsername, password)).json().data.token;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM app_user WHERE username = ANY($1)', [
      [adminUsername, staffUsername],
    ]);
    await app.close();
    await pool.end();
  });

  describe('GET /users', () => {
    it('returns 401 without a token', async () => {
      const response = await app.inject({ method: 'GET', url: '/users' });
      expect(response.statusCode).toBe(401);
    });

    it('returns 403 for a non-admin (staff) token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users',
        headers: { authorization: `Bearer ${staffToken}` },
      });
      expect(response.statusCode).toBe(403);
    });

    it('returns the user list for an admin, with no password_hash exposed', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);

      const staff = body.data.find((u: { username: string }) => u.username === staffUsername);
      expect(staff).toMatchObject({
        id: expect.any(String),
        username: staffUsername,
        role: 'staff',
        createdAt: expect.any(String),
      });
      for (const user of body.data) {
        expect(user).not.toHaveProperty('password_hash');
        expect(user).not.toHaveProperty('passwordHash');
      }
    });
  });

  describe('PATCH /users/:id/password', () => {
    it('returns 403 for a non-admin (staff) token', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/users/${staffId}/password`,
        headers: { authorization: `Bearer ${staffToken}` },
        payload: { newPassword: 'reset-by-staff-1' },
      });
      expect(response.statusCode).toBe(403);
    });

    it('lets an admin reset another user password (204) then that user logs in with the new one', async () => {
      const newPassword = 'reset-by-admin-9';
      const response = await app.inject({
        method: 'PATCH',
        url: `/users/${staffId}/password`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { newPassword },
      });
      expect(response.statusCode).toBe(204);
      expect(response.body).toBe('');

      const loginNew = await login(staffUsername, newPassword);
      expect(loginNew.statusCode).toBe(200);

      const loginOld = await login(staffUsername, password);
      expect(loginOld.statusCode).toBe(401);
    });

    it('returns 400 when the new password is shorter than 8 characters', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/users/${staffId}/password`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { newPassword: 'short' },
      });
      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for an invalid uuid param', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/users/not-a-uuid/password',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { newPassword: 'valid-pass-123' },
      });
      expect(response.statusCode).toBe(400);
    });

    it('returns 404 when the target user does not exist', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/users/00000000-0000-0000-0000-000000000000/password',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { newPassword: 'valid-pass-123' },
      });
      expect(response.statusCode).toBe(404);
    });
  });
});
