import { describe, it, expect, vi } from 'vitest';
import { requireRole } from '../middleware/role.middleware.js';

describe('requireRole middleware', () => {
  it('calls next() when the user has the required role', () => {
    const middleware = requireRole('ADMIN');
    const req = { user: { role: 'ADMIN' } };
    const res = {};
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 403 when the user role is not allowed', () => {
    const middleware = requireRole('ADMIN');
    const req = { user: { role: 'SALES' } };
    const json = vi.fn();
    const res = { status: vi.fn().mockReturnValue({ json }) };
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    expect(next).not.toHaveBeenCalled();
  });

  it('allows access when role is in a list of multiple roles', () => {
    const middleware = requireRole('ADMIN', 'MANAGER');
    const req = { user: { role: 'MANAGER' } };
    const res = {};
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('denies SALES when only ADMIN and MANAGER are allowed', () => {
    const middleware = requireRole('ADMIN', 'MANAGER');
    const req = { user: { role: 'SALES' } };
    const json = vi.fn();
    const res = { status: vi.fn().mockReturnValue({ json }) };
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when req.user is missing (not authenticated)', () => {
    const middleware = requireRole('ADMIN');
    const req = {};
    const json = vi.fn();
    const res = { status: vi.fn().mockReturnValue({ json }) };
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });
});
