import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { userIdParamsSchema } from './schema.js';
import { resetPasswordSchema } from '../auth/schema.js';
import { createAuthRepository } from '../auth/repository.js';
import { createAuthService, UserNotFoundError } from '../auth/service.js';
import { requireAuth, requireRole } from '../auth/guard.js';

/**
 * Bề mặt quản trị user (Owner/admin): liệt kê user + reset MK cho user khác.
 * Thao tác trên bảng app_user nên dùng lại repository/service của module auth.
 */
export async function registerUsersRoutes(app: FastifyInstance, pool: Pool): Promise<void> {
  const repository = createAuthRepository(pool);
  const service = createAuthService(repository);

  // Danh sách user cho admin — KHÔNG trả password_hash (service.listUsers).
  app.get(
    '/users',
    { preHandler: [requireAuth, requireRole('admin')] },
    async (_request, reply) => {
      const users = await service.listUsers();
      reply.send({ success: true, data: users });
    },
  );

  // Owner reset MK cho user khác (không cần MK cũ, spec D2). Rate-limit nhẹ (admin-only) để nhất quán với /auth/*.
  app.patch(
    '/users/:id/password',
    {
      preHandler: [requireAuth, requireRole('admin')],
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const parsedParams = userIdParamsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        reply.code(400).send({ success: false, error: 'id không hợp lệ' });
        return;
      }

      const parsedBody = resetPasswordSchema.safeParse(request.body);
      if (!parsedBody.success) {
        reply.code(400).send({ success: false, error: 'Dữ liệu đặt lại mật khẩu không hợp lệ' });
        return;
      }

      try {
        await service.resetPassword(parsedParams.data.id, parsedBody.data.newPassword);
        reply.code(204).send();
      } catch (error) {
        if (error instanceof UserNotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
          return;
        }
        throw error;
      }
    },
  );
}
