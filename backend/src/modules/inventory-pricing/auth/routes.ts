import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { loginBodySchema } from './schema.js';
import { createAuthRepository } from './repository.js';
import { createAuthService, InvalidCredentialsError } from './service.js';

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
}
