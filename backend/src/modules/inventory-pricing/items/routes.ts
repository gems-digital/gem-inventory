import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import {
  listItemsQuerySchema,
  itemIdParamsSchema,
  itemInputSchema,
  itemUpdateSchema,
} from './schema.js';
import { createItemsRepository } from './repository.js';
import { createItemsService } from './service.js';
import { ItemNotFoundError, DuplicateItemCodeError, InvalidDimensionsError } from './errors.js';
import { requireAuth } from '../auth/guard.js';

/**
 * Đăng ký các route inventory_item (đọc + viết). Mọi route yêu cầu auth (BUILD.md).
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

  app.post('/inventory/items', { preHandler: requireAuth }, async (request, reply) => {
    const parsed = itemInputSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ success: false, error: 'Dữ liệu món hàng không hợp lệ' });
      return;
    }

    // requireAuth đã gắn request.user, không rơi vào nhánh này sau preHandler.
    const userId = request.user?.sub as string;

    try {
      const item = await service.createItem(parsed.data, userId);
      reply.code(201).send({ success: true, data: item });
    } catch (error) {
      if (error instanceof DuplicateItemCodeError) {
        reply.code(409).send({ success: false, error: error.message });
        return;
      }
      throw error;
    }
  });

  app.patch('/inventory/items/:id', { preHandler: requireAuth }, async (request, reply) => {
    const parsedParams = itemIdParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      reply.code(400).send({ success: false, error: 'id không hợp lệ' });
      return;
    }

    const parsedBody = itemUpdateSchema.safeParse(request.body);
    if (!parsedBody.success) {
      reply.code(400).send({ success: false, error: 'Dữ liệu cập nhật không hợp lệ' });
      return;
    }

    const userId = request.user?.sub as string;

    try {
      const item = await service.updateItem(parsedParams.data.id, parsedBody.data, userId);
      reply.send({ success: true, data: item });
    } catch (error) {
      if (error instanceof ItemNotFoundError) {
        reply.code(404).send({ success: false, error: error.message });
        return;
      }
      if (error instanceof DuplicateItemCodeError) {
        reply.code(409).send({ success: false, error: error.message });
        return;
      }
      if (error instanceof InvalidDimensionsError) {
        reply.code(400).send({ success: false, error: error.message });
        return;
      }
      throw error;
    }
  });
}
