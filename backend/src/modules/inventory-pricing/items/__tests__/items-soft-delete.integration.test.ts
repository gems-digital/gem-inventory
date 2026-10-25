import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../../../db/pool.js';
import { runMigrations } from '../../../../db/migrate.js';
import { hashPassword } from '../../auth/password.js';
import { registerAuthRoutes } from '../../auth/routes.js';
import { registerItemsRoutes } from '../routes.js';

/**
 * Integration test cho soft-delete (UC-06): DELETE ẩn món, POST restore khôi phục,
 * trên Postgres thật (Docker). Chạy độc lập với các test khác (prefix mã riêng).
 */
describe('DELETE + restore /inventory/items (integration)', () => {
  let app: FastifyInstance;
  const username = 'items.softdelete.integration.user';
  const password = 'correct-password-123';
  const seedCode = 'TEST-SOFTDEL-001';
  let token: string;

  function validInput(overrides: Record<string, unknown> = {}) {
    return {
      code: seedCode,
      name: 'Món test ẩn',
      itemKind: 'unique',
      productType: 'ring',
      jadeType: 'Cẩm thạch',
      color: 'Xanh',
      size: '7',
      menh: ['Moc'],
      note: null,
      photoUrls: ['https://picsum.photos/seed/test-softdel-001/600'],
      quantity: 1,
      costPriceVnd: 1_000_000,
      salePriceVnd: 2_000_000,
      floorPriceVnd: 1_500_000,
      ...overrides,
    };
  }

  async function createItem(code: string): Promise<string> {
    const response = await app.inject({
      method: 'POST',
      url: '/inventory/items',
      headers: { authorization: `Bearer ${token}` },
      payload: validInput({ code }),
    });
    expect(response.statusCode).toBe(201);
    return response.json().data.id;
  }

  async function listCodes(): Promise<string[]> {
    const response = await app.inject({
      method: 'GET',
      url: '/inventory/items',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(200);
    return response.json().data.map((item: { code: string }) => item.code);
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
    await pool.query('DELETE FROM inventory_item WHERE code LIKE $1', ['TEST-SOFTDEL-%']);

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
    await pool.query('DELETE FROM inventory_item WHERE code LIKE $1', ['TEST-SOFTDEL-%']);
    await pool.query('DELETE FROM app_user WHERE username = $1', [username]);
    await app.close();
    await pool.end();
  });

  it('returns 401 for DELETE without a token', async () => {
    const id = '00000000-0000-0000-0000-000000000000';
    const response = await app.inject({ method: 'DELETE', url: `/inventory/items/${id}` });
    expect(response.statusCode).toBe(401);
  });

  it('DELETE hides the item from the list and GET /:id returns 404', async () => {
    const id = await createItem('TEST-SOFTDEL-001');

    expect(await listCodes()).toContain('TEST-SOFTDEL-001');

    const del = await app.inject({
      method: 'DELETE',
      url: `/inventory/items/${id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(del.statusCode).toBe(204);
    expect(del.body).toBe('');

    expect(await listCodes()).not.toContain('TEST-SOFTDEL-001');

    const detail = await app.inject({
      method: 'GET',
      url: `/inventory/items/${id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(detail.statusCode).toBe(404);
  });

  it('DELETE is idempotent (second DELETE still 204)', async () => {
    const id = await createItem('TEST-SOFTDEL-002');

    const first = await app.inject({
      method: 'DELETE',
      url: `/inventory/items/${id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(first.statusCode).toBe(204);

    const second = await app.inject({
      method: 'DELETE',
      url: `/inventory/items/${id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(second.statusCode).toBe(204);
  });

  it('DELETE of a never-existing id is idempotent (204)', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/inventory/items/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(204);
  });

  it('POST restore brings a hidden item back into list and detail', async () => {
    const id = await createItem('TEST-SOFTDEL-003');

    await app.inject({
      method: 'DELETE',
      url: `/inventory/items/${id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(await listCodes()).not.toContain('TEST-SOFTDEL-003');

    const restore = await app.inject({
      method: 'POST',
      url: `/inventory/items/${id}/restore`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(restore.statusCode).toBe(200);
    const body = restore.json();
    expect(body.success).toBe(true);
    expect(body.data.code).toBe('TEST-SOFTDEL-003');

    expect(await listCodes()).toContain('TEST-SOFTDEL-003');

    const detail = await app.inject({
      method: 'GET',
      url: `/inventory/items/${id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().data.code).toBe('TEST-SOFTDEL-003');
  });

  it('restore of a non-hidden item returns 404', async () => {
    const id = await createItem('TEST-SOFTDEL-004');

    const response = await app.inject({
      method: 'POST',
      url: `/inventory/items/${id}/restore`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(404);
  });

  it('restore of an unknown id returns 404', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/inventory/items/00000000-0000-0000-0000-000000000000/restore',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(404);
  });

  it('a hidden item still blocks reusing its code (retained global UNIQUE → 409)', async () => {
    const id = await createItem('TEST-SOFTDEL-005');

    const del = await app.inject({
      method: 'DELETE',
      url: `/inventory/items/${id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(del.statusCode).toBe(204);

    // Mã đã ẩn vẫn UNIQUE toàn cục (spec §3) → tạo mới cùng mã bị chặn.
    const recreate = await app.inject({
      method: 'POST',
      url: '/inventory/items',
      headers: { authorization: `Bearer ${token}` },
      payload: validInput({ code: 'TEST-SOFTDEL-005' }),
    });
    expect(recreate.statusCode).toBe(409);
    expect(recreate.json().success).toBe(false);
  });
});
