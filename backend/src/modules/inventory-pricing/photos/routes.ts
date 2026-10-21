import type { FastifyInstance } from 'fastify';
import { signPhotosBodySchema } from './schema.js';
import { createPhotosService } from './service.js';
import { s3Client } from './s3-client.js';
import { requireAuth } from '../auth/guard.js';

/**
 * POST /inventory/photos/sign (auth) — ký URL upload ảnh lên MinIO cho client.
 */
export async function registerPhotosRoutes(app: FastifyInstance): Promise<void> {
  const service = createPhotosService(s3Client);

  app.post('/inventory/photos/sign', { preHandler: requireAuth }, async (request, reply) => {
    const parsed = signPhotosBodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ success: false, error: 'Dữ liệu ký ảnh không hợp lệ' });
      return;
    }

    const contentTypes = parsed.data.files.map((file) => file.contentType);
    const signed = await service.signUploads(contentTypes);
    reply.send({ success: true, data: signed });
  });
}
