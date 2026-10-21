import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../../../db/pool.js';
import { runMigrations } from '../../../../db/migrate.js';
import { hashPassword } from '../../auth/password.js';
import { registerAuthRoutes } from '../../auth/routes.js';
import { registerItemsRoutes } from '../routes.js';

/**
 * Integration test cho POST/PATCH /inventory/items trên Postgres thật (Docker).
 */
describe('POST/PATCH /inventory/items (integration)', () => {
  let app: FastifyInstance;
  const username = 'items.write.integration.user';
  const password = 'correct-password-123';
  const seedCode = 'TEST-WRITE-001';
  let token: string;

  function validInput(overrides: Record<string, unknown> = {}) {
    return {
      code: seedCode,
      name: 'Món test ghi',
      itemKind: 'unique',
      productType: 'ring',
      jadeType: 'Cẩm thạch',
      color: 'Xanh',
      size: '7',
      menh: ['Moc'],
      note: null,
      photoUrls: ['https://picsum.photos/seed/test-write-001/600'],
      quantity: 1,
      costPriceVnd: 1_000_000,
      salePriceVnd: 2_000_000,
      floorPriceVnd: 1_500_000,
      ...overrides,
    };
  }

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

    // Dọn item test cũ (nếu chạy lại) để 201 luôn thành công lần đầu.
    await pool.query('DELETE FROM inventory_item WHERE code LIKE $1', ['TEST-WRITE-%']);

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
    await pool.query('DELETE FROM inventory_item WHERE code LIKE $1', ['TEST-WRITE-%']);
    await pool.query('DELETE FROM app_user WHERE username = $1', [username]);
    await app.close();
    await pool.end();
  });

  it('returns 401 without a token', async () => {
    const response = await app.inject({ method: 'POST', url: '/inventory/items', payload: validInput() });
    expect(response.statusCode).toBe(401);
  });

  it('returns 400 for invalid body (missing required fields)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/inventory/items',
      headers: { authorization: `Bearer ${token}` },
      payload: { code: 'TEST-WRITE-BAD' },
    });
    expect(response.statusCode).toBe(400);
  });

  let createdId: string;

  it('creates an item and returns 201 with computed margin', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/inventory/items',
      headers: { authorization: `Bearer ${token}` },
      payload: validInput(),
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.code).toBe(seedCode);
    expect(body.data.marginVnd).toBe(1_000_000);
    createdId = body.data.id;
  });

  it('returns 409 when creating the same code again', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/inventory/items',
      headers: { authorization: `Bearer ${token}` },
      payload: validInput(),
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().success).toBe(false);
  });

  it('updates the item via PATCH (partial)', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/inventory/items/${createdId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { salePriceVnd: 2_500_000, note: 'đã cập nhật' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.salePriceVnd).toBe(2_500_000);
    expect(body.data.note).toBe('đã cập nhật');
    expect(body.data.marginVnd).toBe(2_500_000 - 1_000_000);
  });

  it('returns 404 when patching an unknown id', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/inventory/items/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${token}` },
      payload: { note: 'x' },
    });
    expect(response.statusCode).toBe(404);
  });
});
