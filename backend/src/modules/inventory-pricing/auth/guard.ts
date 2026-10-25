import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyToken } from './jwt.js';
import type { JwtPayload, UserRole } from './types.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

function sendUnauthorized(reply: FastifyReply): void {
  reply.code(401).send({ success: false, error: 'Thiếu hoặc token không hợp lệ' });
}

/**
 * Guard: verify Bearer JWT → gắn request.user. Dùng làm preHandler cho route cần auth.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    sendUnauthorized(reply);
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    request.user = verifyToken(token);
  } catch {
    sendUnauthorized(reply);
  }
}

/**
 * RBAC: dùng sau requireAuth. Trả preHandler chặn role không đủ quyền.
 */
export function requireRole(role: UserRole) {
  return async function roleGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!request.user) {
      sendUnauthorized(reply);
      return;
    }

    if (request.user.role !== role) {
      reply.code(403).send({ success: false, error: 'Không đủ quyền truy cập' });
      return;
    }
  };
}
