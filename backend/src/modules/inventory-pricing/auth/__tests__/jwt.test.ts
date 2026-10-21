import { describe, expect, it } from 'vitest';
import { signToken, verifyToken } from '../jwt.js';
import type { JwtPayload } from '../types.js';

describe('JWT sign/verify', () => {
  const payload: JwtPayload = { sub: 'user-1', username: 'owner', role: 'admin' };

  it('round-trips a valid payload', () => {
    const token = signToken(payload);
    const decoded = verifyToken(token);
    expect(decoded).toEqual(payload);
  });

  it('throws on a tampered token', () => {
    const token = signToken(payload);
    const tampered = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;
    expect(() => verifyToken(tampered)).toThrow();
  });

  it('throws on a garbage token', () => {
    expect(() => verifyToken('not.a.jwt')).toThrow();
  });
});
