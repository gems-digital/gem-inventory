import { env } from './env.js';

const DEV_DEFAULT_ORIGINS = ['http://localhost:5173', 'http://localhost:4173'];

/**
 * Origin cho phép gọi API (CORS). CORS_ORIGINS (env, phân tách bằng dấu phẩy)
 * override; rỗng/absent → dùng default dev (Vite dev/preview).
 */
export function getAllowedOrigins(): string[] {
  const configured = env.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return configured.length > 0 ? configured : DEV_DEFAULT_ORIGINS;
}
