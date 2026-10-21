import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../../../db/pool.js';
import { runMigrations } from '../../../../db/migrate.js';
import { hashPassword } from '../password.js';
import { registerAuthRoutes } from '../routes.js';

/**
 * Integration test chạy trên Postgres thật (Docker: xem BUILD.md).
 * Seed user riêng cho test, độc lập với db:seed dev.
 */
describe('POST /auth/login (integration)', () => {
  let app: FastifyInstance;
  const username = 'integration.test.user';
  const password = 'correct-password-123';

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

  it('returns a token and user envelope on correct credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username, password },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(typeof body.data.token).toBe('string');
    expect(body.data.user).toEqual({ id: expect.any(String), username, role: 'staff' });
  });

  it('returns 401 with a generic message on wrong password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username, password: 'wrong-password' },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeTypeOf('string');
  });

  it('returns 401 for an unknown username (same generic message)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'does.not.exist', password: 'whatever' },
    });

    expect(response.statusCode).toBe(401);
  });
});
