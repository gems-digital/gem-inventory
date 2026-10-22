import { z } from 'zod';
import { config as loadDotenv } from 'dotenv';

loadDotenv();

/**
 * Validate biến môi trường lúc khởi động — fail fast nếu thiếu secret.
 * (Theo rule security: validate required secrets at startup.)
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('7d'),
  MINIO_ENDPOINT: z.string().min(1),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),
  MINIO_BUCKET: z.string().min(1),
  MINIO_PUBLIC_URL: z.string().min(1),
  // Danh sách origin cho CORS, phân tách bằng dấu phẩy. Rỗng/absent → dùng
  // default dev (localhost:5173, localhost:4173 — Vite dev/preview).
  CORS_ORIGINS: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Cấu hình môi trường không hợp lệ:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
