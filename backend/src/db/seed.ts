import { hashPassword } from '../modules/inventory-pricing/auth/password.js';
import { pool } from './pool.js';
import { seedItems } from './seed-items.js';

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

async function seedUser(user: SeedUser): Promise<string> {
  const passwordHash = await hashPassword(user.password);
  const result = await pool.query<{ id: string }>(
    `INSERT INTO app_user (username, password_hash, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
     RETURNING id`,
    [user.username, passwordHash, user.role],
  );
  const id = result.rows[0]?.id;
  if (!id) {
    throw new Error(`Seed user ${user.username} không trả về id`);
  }
  return id;
}

async function main(): Promise<void> {
  const users = getSeedUsers();
  let adminUserId: string | null = null;
  for (const user of users) {
    const id = await seedUser(user);
    if (user.role === 'admin') {
      adminUserId = id;
    }
  }

  // Món mẫu chỉ seed cho dev; production đặt SEED_DEMO_ITEMS=false để DB luôn trống.
  const seedDemo = process.env.SEED_DEMO_ITEMS !== 'false';

  // eslint-disable-next-line no-console
  console.log('✅ Seed xong. Thông tin đăng nhập:');
  for (const user of users) {
    // eslint-disable-next-line no-console
    console.log(`  - ${user.role}: username=${user.username} password=${user.password}`);
  }

  if (seedDemo) {
    const items = await seedItems(pool, adminUserId);
    // eslint-disable-next-line no-console
    console.log(`✅ Seed ${items.length} inventory_item mẫu: ${items.map((i) => i.code).join(', ')}`);
  } else {
    // eslint-disable-next-line no-console
    console.log('ℹ️  SEED_DEMO_ITEMS=false → bỏ qua món mẫu (DB trống).');
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
