import { Pool } from 'pg';
import { env } from '../config/env.js';

/**
 * Pool kết nối Postgres dùng chung cho toàn app (migration, seed, repository).
 */
export const pool = new Pool({ connectionString: env.DATABASE_URL });
