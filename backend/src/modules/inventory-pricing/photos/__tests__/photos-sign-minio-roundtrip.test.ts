import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import { pool } from '../../../../db/pool.js';
import { hashPassword } from '../../auth/password.js';
import { registerAuthRoutes } from '../../auth/routes.js';
import { registerPhotosRoutes } from '../routes.js';
import { env } from '../../../../config/env.js';

/**
 * PUT→GET roundtrip thật trên MinIO. Chỉ chạy khi MinIO đang sống ở MINIO_ENDPOINT
 * (BUILD.md: image minio/minio có thể không pull được trong sandbox — khi đó test
 * này tự skip sạch, không treo CI/dev).
 */
async function isMinioReachable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const response = await fetch(`${env.MINIO_ENDPOINT}/minio/health/live`, { signal: controller.signal });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

describe('POST /inventory/photos/sign — MinIO roundtrip', () => {
  let app: FastifyInstance;
  const username = 'photos.minio.roundtrip.user';
  const password = 'correct-password-123';
  let token: string;

  beforeAll(async () => {
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
    await registerPhotosRoutes(app);
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

  it('PUT ảnh lên uploadUrl rồi GET lại publicUrl thành công', async (ctx) => {
    const reachable = await isMinioReachable();
    if (!reachable) {
      ctx.skip();
      return;
    }

    const signResponse = await app.inject({
      method: 'POST',
      url: '/inventory/photos/sign',
      headers: { authorization: `Bearer ${token}` },
      payload: { files: [{ contentType: 'image/png' }] },
    });
    const [signed] = signResponse.json().data;

    const tinyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );

    const putResponse = await fetch(signed.uploadUrl, {
      method: 'PUT',
      headers: { 'content-type': 'image/png' },
      body: tinyPng,
    });
    expect(putResponse.ok).toBe(true);

    const getResponse = await fetch(signed.publicUrl);
    expect(getResponse.ok).toBe(true);
  });
});
