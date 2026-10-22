import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../../../db/pool.js';
import { hashPassword } from '../../auth/password.js';
import { registerAuthRoutes } from '../../auth/routes.js';
import { registerPhotosRoutes } from '../routes.js';
import { env } from '../../../../config/env.js';

/**
 * Test POST /inventory/photos/sign. Ký URL diễn ra hoàn toàn cục bộ (SigV4, không
 * gọi network tới MinIO) — nên KHÔNG cần MinIO đang chạy để kiểm tra các case này.
 * Chỉ cần Postgres (cho /auth/login lấy token).
 */
describe('POST /inventory/photos/sign', () => {
  let app: FastifyInstance;
  const username = 'photos.sign.test.user';
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

  it('returns 401 without a token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/inventory/photos/sign',
      payload: { files: [{ contentType: 'image/jpeg' }] },
    });
    expect(response.statusCode).toBe(401);
  });

  it('returns 400 for an empty files array', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/inventory/photos/sign',
      headers: { authorization: `Bearer ${token}` },
      payload: { files: [] },
    });
    expect(response.statusCode).toBe(400);
  });

  it('returns 400 for more than 8 files', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/inventory/photos/sign',
      headers: { authorization: `Bearer ${token}` },
      payload: { files: Array.from({ length: 9 }, () => ({ contentType: 'image/jpeg' })) },
    });
    expect(response.statusCode).toBe(400);
  });

  it('returns 400 for an unsupported content type', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/inventory/photos/sign',
      headers: { authorization: `Bearer ${token}` },
      payload: { files: [{ contentType: 'application/pdf' }] },
    });
    expect(response.statusCode).toBe(400);
  });

  it('signs a valid S3 PUT presigned URL and matching publicUrl/key', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/inventory/photos/sign',
      headers: { authorization: `Bearer ${token}` },
      payload: { files: [{ contentType: 'image/jpeg' }, { contentType: 'image/png' }] },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);

    const expectedPrefix = `${env.MINIO_ENDPOINT}/${env.MINIO_BUCKET}/`;
    for (const [index, signed] of body.data.entries()) {
      expect(signed.uploadUrl).toContain('X-Amz-Signature=');
      expect(signed.uploadUrl).toContain(expectedPrefix);
      expect(signed.key).toMatch(/^items\/[0-9a-f-]+\.(jpg|png)$/);
      expect(signed.publicUrl).toBe(`${env.MINIO_PUBLIC_URL}/${env.MINIO_BUCKET}/${signed.key}`);
      expect(signed.key.endsWith(index === 0 ? '.jpg' : '.png')).toBe(true);
    }

    // Mỗi file có key riêng (uuid khác nhau).
    expect(body.data[0].key).not.toBe(body.data[1].key);
  });
});
