import argon2 from 'argon2';

/**
 * Hash/verify mật khẩu bằng argon2 (khuyến nghị hơn bcrypt cho dự án mới).
 */
export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    // Hash hỏng/định dạng lạ → coi như sai mật khẩu, không throw lộ chi tiết.
    return false;
  }
}
