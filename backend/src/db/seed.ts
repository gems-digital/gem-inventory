import { hashPassword } from '../modules/inventory-pricing/auth/password.js';
import { pool } from './pool.js';

interface SeedUser {
  username: string;
  password: string;
  role: 'admin' | 'staff';
}

/**
 * Seed 2 user dev: admin (owner) và staff (chi.trang). Mật khẩu đọc từ env,
 * có default để tiện chạy local — KHÔNG dùng default này ở production.
 */
function getSeedUsers(): SeedUser[] {
  return [
    {
      username: process.env.SEED_ADMIN_USERNAME ?? 'owner',
      password: process.env.SEED_ADMIN_PASSWORD ?? 'owner123',
      role: 'admin',
    },
    {
      username: process.env.SEED_STAFF_USERNAME ?? 'chi.trang',
      password: process.env.SEED_STAFF_PASSWORD ?? 'trang123',
      role: 'staff',
    },
  ];
}

async function seedUser(user: SeedUser): Promise<void> {
  const passwordHash = await hashPassword(user.password);
  await pool.query(
    `INSERT INTO app_user (username, password_hash, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role`,
    [user.username, passwordHash, user.role],
  );
}

async function main(): Promise<void> {
  const users = getSeedUsers();
  for (const user of users) {
    await seedUser(user);
  }

  // eslint-disable-next-line no-console
  console.log('✅ Seed xong. Thông tin đăng nhập dev:');
  for (const user of users) {
    // eslint-disable-next-line no-console
    console.log(`  - ${user.role}: username=${user.username} password=${user.password}`);
  }
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown seed error';
    // eslint-disable-next-line no-console
    console.error('❌ Seed lỗi:', message);
    process.exit(1);
  })
  .finally(() => {
    void pool.end();
  });
