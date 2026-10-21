import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../password.js';

describe('password hashing (argon2)', () => {
  it('verifies a correct password against its hash', async () => {
    const hash = await hashPassword('owner123');
    await expect(verifyPassword(hash, 'owner123')).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('owner123');
    await expect(verifyPassword(hash, 'wrong-password')).resolves.toBe(false);
  });

  it('rejects a malformed hash instead of throwing', async () => {
    await expect(verifyPassword('not-a-real-hash', 'owner123')).resolves.toBe(false);
  });
});
