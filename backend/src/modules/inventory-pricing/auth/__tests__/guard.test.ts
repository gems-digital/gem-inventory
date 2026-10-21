import { describe, expect, it, vi } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { requireAuth, requireRole } from '../guard.js';
import { signToken } from '../jwt.js';

function createMockReply() {
  const reply = {
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return reply as unknown as FastifyReply & { code: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> };
}

function createMockRequest(headers: Record<string, string> = {}): FastifyRequest {
  return { headers } as unknown as FastifyRequest;
}

describe('requireAuth guard', () => {
  it('attaches request.user for a valid Bearer token', async () => {
    const token = signToken({ sub: 'u1', username: 'owner', role: 'admin' });
    const request = createMockRequest({ authorization: `Bearer ${token}` });
    const reply = createMockReply();

    await requireAuth(request, reply);

    expect(request.user).toEqual({ sub: 'u1', username: 'owner', role: 'admin' });
    expect(reply.code).not.toHaveBeenCalled();
  });

  it('responds 401 when Authorization header is missing', async () => {
    const request = createMockRequest();
    const reply = createMockReply();

    await requireAuth(request, reply);

    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalled();
  });

  it('responds 401 for an invalid token', async () => {
    const request = createMockRequest({ authorization: 'Bearer garbage' });
    const reply = createMockReply();

    await requireAuth(request, reply);

    expect(reply.code).toHaveBeenCalledWith(401);
  });
});

describe('requireRole RBAC helper', () => {
  it('allows a matching role through', async () => {
    const request = createMockRequest();
    request.user = { sub: 'u1', username: 'owner', role: 'admin' };
    const reply = createMockReply();

    await requireRole('admin')(request, reply);

    expect(reply.code).not.toHaveBeenCalled();
  });

  it('responds 403 for a mismatched role', async () => {
    const request = createMockRequest();
    request.user = { sub: 'u2', username: 'chi.trang', role: 'staff' };
    const reply = createMockReply();

    await requireRole('admin')(request, reply);

    expect(reply.code).toHaveBeenCalledWith(403);
  });

  it('responds 401 when no user is attached', async () => {
    const request = createMockRequest();
    const reply = createMockReply();

    await requireRole('admin')(request, reply);

    expect(reply.code).toHaveBeenCalledWith(401);
  });
});
