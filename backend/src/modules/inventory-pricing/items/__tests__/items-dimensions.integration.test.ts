import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../../../db/pool.js';
import { runMigrations } from '../../../../db/migrate.js';
import { hashPassword } from '../../auth/password.js';
import { registerAuthRoutes } from '../../auth/routes.js';
import { registerItemsRoutes } from '../routes.js';

/**
 * Slice 5 — dimensions có cấu trúc theo productType + đặc điểm chung (treatment,
 * transparency, origin, weightGram, certificateCode). Mọi field OPTIONAL — item
 * cũ/mới đều lưu được, không phá API cũ (BUILD.md §Slice 5).
 */
describe('POST/PATCH /inventory/items — dimensions & attributes (Slice 5)', () => {
  let app: FastifyInstance;
  const username = 'items.dimensions.integration.user';
  const password = 'correct-password-123';
  let token: string;

  function baseInput(overrides: Record<string, unknown> = {}) {
    return {
      code: 'TEST-DIM-001',
      name: 'Vòng test kích thước',
      itemKind: 'unique',
      productType: 'bracelet',
      jadeType: 'Cẩm thạch',
      color: 'Xanh',
      menh: ['Moc'],
      photoUrls: ['https://picsum.photos/seed/test-dim-001/600'],
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
    await pool.query(
      `INSERT INTO app_user (username, password_hash, role)
       VALUES ($1, $2, 'staff')
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [username, passwordHash],
    );

    await pool.query('DELETE FROM inventory_item WHERE code LIKE $1', ['TEST-DIM-%']);

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
    await pool.query('DELETE FROM inventory_item WHERE code LIKE $1', ['TEST-DIM-%']);
    await pool.query('DELETE FROM app_user WHERE username = $1', [username]);
    await app.close();
    await pool.end();
  });

  function auth() {
    return { authorization: `Bearer ${token}` };
  }

  it('creates a bracelet with matching dimensions → 201, read-back has dimensions', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/inventory/items',
      headers: auth(),
      payload: baseInput({
        code: 'TEST-DIM-001',
        dimensions: { innerDiameterMm: 56, widthMm: 12, thicknessMm: 9 },
        treatment: 'A',
        transparency: 'ice',
        origin: 'myanmar',
        weightGram: 18.5,
        certificateCode: 'GIA-TEST-001',
      }),
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.data.dimensions).toEqual({ innerDiameterMm: 56, widthMm: 12, thicknessMm: 9 });
    expect(body.data.treatment).toBe('A');
    expect(body.data.transparency).toBe('ice');
    expect(body.data.origin).toBe('myanmar');
    expect(body.data.weightGram).toBe(18.5);
    expect(body.data.certificateCode).toBe('GIA-TEST-001');

    const getResponse = await app.inject({
      method: 'GET',
      url: `/inventory/items/${body.data.id}`,
      headers: auth(),
    });
    expect(getResponse.json().data.dimensions).toEqual({ innerDiameterMm: 56, widthMm: 12, thicknessMm: 9 });
  });

  it('creates an item WITHOUT dimensions/attrs → still 201 (all optional)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/inventory/items',
      headers: auth(),
      payload: baseInput({ code: 'TEST-DIM-002' }),
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.data.dimensions).toBeNull();
    expect(body.data.treatment).toBeNull();
    expect(body.data.weightGram).toBeNull();
  });

  it('rejects dimensions with the wrong type for the field (400)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/inventory/items',
      headers: auth(),
      payload: baseInput({
        code: 'TEST-DIM-003',
        dimensions: { innerDiameterMm: 'fifty-six' }, // phải là number
      }),
    });
    expect(response.statusCode).toBe(400);
  });

  it('rejects dimensions shaped for the wrong productType (400)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/inventory/items',
      headers: auth(),
      payload: baseInput({
        code: 'TEST-DIM-004',
        productType: 'ring',
        // beadCount không thuộc shape của ring (.strict() từ chối field lạ)
        dimensions: { beadCount: 108 },
      }),
    });
    expect(response.statusCode).toBe(400);
  });

  it('PATCH updates dimensions + treatment together', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/inventory/items',
      headers: auth(),
      payload: baseInput({ code: 'TEST-DIM-005' }),
    });
    const id = createResponse.json().data.id;

    const patchResponse = await app.inject({
      method: 'PATCH',
      url: `/inventory/items/${id}`,
      headers: auth(),
      payload: {
        dimensions: { innerDiameterMm: 58, widthMm: 14, thicknessMm: 10 },
        treatment: 'BC',
      },
    });

    expect(patchResponse.statusCode).toBe(200);
    const body = patchResponse.json();
    expect(body.data.dimensions).toEqual({ innerDiameterMm: 58, widthMm: 14, thicknessMm: 10 });
    expect(body.data.treatment).toBe('BC');
  });

  it('PATCH rejects dimensions shaped for the wrong type when productType is known from the existing item (400)', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/inventory/items',
      headers: auth(),
      payload: baseInput({ code: 'TEST-DIM-006' }), // bracelet
    });
    const id = createResponse.json().data.id;

    const patchResponse = await app.inject({
      method: 'PATCH',
      url: `/inventory/items/${id}`,
      headers: auth(),
      payload: { dimensions: { beadCount: 108 } }, // shape sai cho bracelet
    });

    expect(patchResponse.statusCode).toBe(400);
  });
});
