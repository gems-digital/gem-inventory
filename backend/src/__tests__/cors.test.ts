import { afterAll, describe, expect, it } from 'vitest';
import { buildServer } from '../index.js';
import { pool } from '../db/pool.js';

/**
 * CORS cho client PWA (web). Origin whitelist qua CORS_ORIGINS (env) — .env dev
 * hiện set http://localhost:5173,http://localhost:4173 (xem cors-origins.ts).
 */
describe('CORS', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('preflight OPTIONS trả Access-Control-Allow-Origin cho origin được phép', async () => {
    const app = await buildServer();
    await app.ready();

    const response = await app.inject({
      method: 'OPTIONS',
      url: '/inventory/items',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'GET',
      },
    });

    expect(response.statusCode).toBeLessThan(300);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(response.headers['access-control-allow-methods']).toContain('GET');

    await app.close();
  });

  it('không trả Access-Control-Allow-Origin cho origin lạ', async () => {
    const app = await buildServer();
    await app.ready();

    const response = await app.inject({
      method: 'OPTIONS',
      url: '/inventory/items',
      headers: {
        origin: 'https://evil.example.com',
        'access-control-request-method': 'GET',
      },
    });

    expect(response.headers['access-control-allow-origin']).toBeUndefined();

    await app.close();
  });

  it('actual request (GET) từ origin lạ không có ACAO (browser sẽ chặn)', async () => {
    const app = await buildServer();
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://evil.example.com' },
    });

    expect(response.headers['access-control-allow-origin']).toBeUndefined();

    await app.close();
  });
});
