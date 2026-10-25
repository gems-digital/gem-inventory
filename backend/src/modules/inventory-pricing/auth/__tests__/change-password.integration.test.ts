import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../../../db/pool.js';
import { runMigrations } from '../../../../db/migrate.js';
import { hashPassword } from '../password.js';
import { registerAuthRoutes } from '../routes.js';

/**
 * Integration test cho PATCH /auth/password (đổi MK tự phục vụ, spec §3).
 * Chạy trên Postgres thật (Docker: xem BUILD.md). Seed user riêng cho test.
 */
describe('PATCH /auth/password (integration)', () => {
  let app: FastifyInstance;
  const username = 'changepw.integration.user';
  const password = 'correct-password-123';

  async function login(pw: string): Promise<ReturnType<FastifyInstance['inject']>> {
    return app.inject({ method: 'POST', url: '/auth/login', payload: { username, password: pw } });
  }

  async function freshToken(): Promise<string> {
    // Mỗi test tự lấy token sau khi reset MK về mặc định, tránh phụ thuộc thứ tự.
    await pool.query('UPDATE app_user SET password_hash = $1 WHERE username = $2', [
      await hashPassword(password),
      username,
    ]);
    const res = await login(password);
    return res.json().data.token;
  }

  beforeAll(async () => {
    await runMigrations();
    const passwordHash = await hashPassword(password);
    await pool.query(
      `INSERT INTO app_user (username, password_hash, role)
       VALUES ($1, $2, 'staff')
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [username, passwordHash],
    );

    app = Fastify();
    await app.register(rateLimit, { global: false });
    await registerAuthRoutes(app, pool);
    await app.ready();
  });

  afterAll(async () => {
    await pool.query('DELETE FROM app_user WHERE username = $1', [username]);
    await app.close();
    await pool.end();
  });

  it('returns 401 without a token', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/auth/password',
      payload: { currentPassword: password, newPassword: 'brand-new-pass-1' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('changes the password (204) then login works with the new password and fails with the old', async () => {
    const token = await freshToken();
    const newPassword = 'brand-new-pass-1';

    const change = await app.inject({
      method: 'PATCH',
      url: '/auth/password',
      headers: { authorization: `Bearer ${token}` },
      payload: { currentPassword: password, newPassword },
    });
    expect(change.statusCode).toBe(204);
    expect(change.body).toBe('');

    const loginNew = await login(newPassword);
    expect(loginNew.statusCode).toBe(200);
    expect(loginNew.json().data.user).not.toHaveProperty('password_hash');

    const loginOld = await login(password);
    expect(loginOld.statusCode).toBe(401);
  });

  it('returns 400 with a generic message when the current password is wrong', async () => {
    const token = await freshToken();

    const response = await app.inject({
      method: 'PATCH',
      url: '/auth/password',
      headers: { authorization: `Bearer ${token}` },
      payload: { currentPassword: 'not-my-password', newPassword: 'brand-new-pass-1' },
    });
    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeTypeOf('string');
  });

  it('returns 400 when the new password is shorter than 8 characters', async () => {
    const token = await freshToken();

    const response = await app.inject({
      method: 'PATCH',
      url: '/auth/password',
      headers: { authorization: `Bearer ${token}` },
      payload: { currentPassword: password, newPassword: 'short' },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().success).toBe(false);
  });
});
