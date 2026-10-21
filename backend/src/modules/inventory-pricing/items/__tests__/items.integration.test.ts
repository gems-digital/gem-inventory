import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../../../db/pool.js';
import { runMigrations } from '../../../../db/migrate.js';
import { seedItems } from '../../../../db/seed-items.js';
import { hashPassword } from '../../auth/password.js';
import { registerAuthRoutes } from '../../auth/routes.js';
import { registerItemsRoutes } from '../routes.js';

/**
 * Integration test trên Postgres thật (Docker: xem BUILD.md). Seed user + 5 item
 * mẫu riêng cho test, độc lập với db:seed dev (upsert theo code nên không trùng).
 */
describe('GET /inventory/items (integration)', () => {
  let app: FastifyInstance;
  const username = 'items.integration.user';
  const password = 'correct-password-123';
  let token: string;

  beforeAll(async () => {
    await runMigrations();

    const passwordHash = await hashPassword(password);
    const userResult = await pool.query<{ id: string }>(
      `INSERT INTO app_user (username, password_hash, role)
       VALUES ($1, $2, 'staff')
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id`,
      [username, passwordHash],
    );
    const userId = userResult.rows[0]?.id;
    if (!userId) {
      throw new Error('Không seed được user cho test');
    }

    await seedItems(pool, userId);

    app = Fastify();
    await app.register(rateLimit, { global: false });
    await registerAuthRoutes(app, pool);
    await registerItemsRoutes(app, pool);
    await app.ready();

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username, password },
    });
    token = loginResponse.json().data.token;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM app_user WHERE username = $1', [username]);
    await app.close();
    await pool.end();
  });

  it('returns 401 without a token', async () => {
    const response = await app.inject({ method: 'GET', url: '/inventory/items' });
    expect(response.statusCode).toBe(401);
  });

  it('lists seeded items with margin computed and meta.total', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/inventory/items',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.meta.total).toBe(body.data.length);
    expect(body.data.length).toBeGreaterThanOrEqual(5);

    const vx001 = body.data.find((item: { code: string }) => item.code === 'VX-001');
    expect(vx001).toBeDefined();
    expect(vx001.marginVnd).toBe(vx001.salePriceVnd - vx001.costPriceVnd);
    expect(vx001.costPriceVnd).toBeTypeOf('number');
  });

  it('flags MD-073 as belowFloorWarn (sát sàn)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/inventory/items?q=MD-073',
      headers: { authorization: `Bearer ${token}` },
    });

    const body = response.json();
    const md073 = body.data.find((item: { code: string }) => item.code === 'MD-073');
    expect(md073).toBeDefined();
    expect(md073.belowFloorWarn).toBe(true);
  });

  it('filters by product_type', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/inventory/items?product_type=ring',
      headers: { authorization: `Bearer ${token}` },
    });

    const body = response.json();
    expect(body.data.length).toBeGreaterThan(0);
    for (const item of body.data) {
      expect(item.productType).toBe('ring');
    }
  });

  it('searches by q against code/name (case-insensitive)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/inventory/items?q=tỳ hưu',
      headers: { authorization: `Bearer ${token}` },
    });

    const body = response.json();
    expect(body.data.some((item: { code: string }) => item.code === 'VX-045')).toBe(true);
  });

  it('GET /inventory/items/:id returns a single item; 404 for unknown id', async () => {
    const list = await app.inject({
      method: 'GET',
      url: '/inventory/items?q=VX-001',
      headers: { authorization: `Bearer ${token}` },
    });
    const vx001Id = list.json().data[0].id;

    const found = await app.inject({
      method: 'GET',
      url: `/inventory/items/${vx001Id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(found.statusCode).toBe(200);
    expect(found.json().data.code).toBe('VX-001');

    const missing = await app.inject({
      method: 'GET',
      url: '/inventory/items/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(missing.statusCode).toBe(404);
  });
});
