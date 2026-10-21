import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { listItemsQuerySchema, itemIdParamsSchema } from './schema.js';
import { createItemsRepository } from './repository.js';
import { createItemsService, ItemNotFoundError } from './service.js';
import { requireAuth } from '../auth/guard.js';

/**
 * Đăng ký GET /inventory/items và GET /inventory/items/:id (yêu cầu auth — BUILD.md).
 */
export async function registerItemsRoutes(app: FastifyInstance, pool: Pool): Promise<void> {
  const repository = createItemsRepository(pool);
  const service = createItemsService(repository);

  app.get('/inventory/items', { preHandler: requireAuth }, async (request, reply) => {
    const parsed = listItemsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.code(400).send({ success: false, error: 'Tham số lọc không hợp lệ' });
      return;
    }

    const { product_type: productType, menh, q } = parsed.data;
    const { items, total } = await service.listItems({ productType, menh, q });
    reply.send({ success: true, data: items, meta: { total } });
  });

  app.get('/inventory/items/:id', { preHandler: requireAuth }, async (request, reply) => {
    const parsedParams = itemIdParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      reply.code(400).send({ success: false, error: 'id không hợp lệ' });
      return;
    }

    try {
      const item = await service.getItemById(parsedParams.data.id);
      reply.send({ success: true, data: item });
    } catch (error) {
      if (error instanceof ItemNotFoundError) {
        reply.code(404).send({ success: false, error: error.message });
        return;
      }
      throw error;
    }
  });
}
