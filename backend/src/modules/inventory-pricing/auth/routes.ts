import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { loginBodySchema, changePasswordSchema } from './schema.js';
import { createAuthRepository } from './repository.js';
import { createAuthService, InvalidCredentialsError, InvalidPasswordError } from './service.js';
import { requireAuth } from './guard.js';

/**
 * Đăng ký POST /auth/login. Rate-limit riêng route này để chống brute force (PRD AC3).
 */
export async function registerAuthRoutes(app: FastifyInstance, pool: Pool): Promise<void> {
  const repository = createAuthRepository(pool);
  const service = createAuthService(repository);

  app.post(
    '/auth/login',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const parsed = loginBodySchema.safeParse(request.body);
      if (!parsed.success) {
        reply.code(400).send({ success: false, error: 'Dữ liệu đăng nhập không hợp lệ' });
        return;
      }

      try {
        const { token, user } = await service.login(parsed.data.username, parsed.data.password);
        reply.send({ success: true, data: { token, user } });
      } catch (error) {
        if (error instanceof InvalidCredentialsError) {
          reply.code(401).send({ success: false, error: error.message });
          return;
        }
        throw error;
      }
    },
  );

  // Đổi MK tự phục vụ (user đang đăng nhập). Rate-limit riêng chống dò MK cũ (spec D5).
  app.patch(
    '/auth/password',
    {
      preHandler: requireAuth,
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const parsed = changePasswordSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.code(400).send({ success: false, error: 'Dữ liệu đổi mật khẩu không hợp lệ' });
        return;
      }

      // requireAuth đã gắn request.user, không rơi vào nhánh này sau preHandler.
      const userId = request.user?.sub as string;

      try {
        await service.changePassword(userId, parsed.data.currentPassword, parsed.data.newPassword);
        reply.code(204).send();
      } catch (error) {
        if (error instanceof InvalidPasswordError) {
          reply.code(400).send({ success: false, error: error.message });
          return;
        }
        throw error;
      }
    },
  );
}
