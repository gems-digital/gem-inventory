import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';
import { env } from './config/env.js';
import { getAllowedOrigins } from './config/cors-origins.js';
import { pool } from './db/pool.js';
import { registerAuthRoutes } from './modules/inventory-pricing/auth/routes.js';
import { registerItemsRoutes } from './modules/inventory-pricing/items/routes.js';
import { registerPhotosRoutes } from './modules/inventory-pricing/photos/routes.js';

/**
 * Điểm khởi động API. Các route nghiệp vụ (auth, inventory, photos, users)
 * sẽ được đăng ký qua module `inventory-pricing` theo kế hoạch triển khai.
 */
export async function buildServer() {
  const app = Fastify({ logger: true });

  // Client là PWA (web) — cần CORS. Origin whitelist qua env CORS_ORIGINS.
  await app.register(cors, {
    origin: getAllowedOrigins(),
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: false, // JWT đi qua header Authorization, không cần cookie/credentials.
  });

  await app.register(rateLimit, { global: false });

  // Không bao giờ cache response dữ liệu nội bộ.
  app.addHook('onSend', async (_req, reply) => {
    reply.header('Cache-Control', 'no-store');
  });

  app.get('/health', async () => ({ success: true, data: { status: 'ok' } }));

  await registerAuthRoutes(app, pool);
  await registerItemsRoutes(app, pool);
  await registerPhotosRoutes(app);

  // TODO(plan): app.register(inventoryPricingModule) — users (admin).

  return app;
}

async function main() {
  const app = await buildServer();
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown startup error';
    // eslint-disable-next-line no-console
    console.error('❌ Không khởi động được server:', message);
    process.exit(1);
  });
}
