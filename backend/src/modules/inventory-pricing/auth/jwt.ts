import jwt from 'jsonwebtoken';
import { env } from '../../../config/env.js';
import type { JwtPayload } from './types.js';

/**
 * Ký/verify JWT. expiresIn lấy từ env (JWT_EXPIRES_IN), secret không bao giờ hardcode.
 */
export function signToken(payload: JwtPayload): string {
  const options: jwt.SignOptions = { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    typeof decoded.sub !== 'string' ||
    typeof decoded.username !== 'string' ||
    (decoded.role !== 'staff' && decoded.role !== 'admin')
  ) {
    throw new Error('Token payload không hợp lệ');
  }

  return { sub: decoded.sub, username: decoded.username, role: decoded.role };
}
