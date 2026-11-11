import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma client so we don't need a real database
vi.mock('../utils/prisma.js', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import prisma from '../utils/prisma.js';
import { login } from '../controllers/auth.controller.js';
import { hashPassword } from '../utils/hash.js';

// Helper to build a mock Express response
function mockRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { json, status };
}

describe('auth.controller — login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a token and user object on valid credentials', async () => {
    const hashedPassword = hashPassword('password123');
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'admin@test.com',
      name: 'Admin User',
      role: 'ADMIN',
      branchId: 'branch-1',
      isActive: true,
      password: hashedPassword,
    });

    const req = { body: { email: 'admin@test.com', password: 'password123' } };
    const res = mockRes();

    await login(req, res);

    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'admin@test.com' },
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        token: expect.any(String),
        user: expect.objectContaining({
          id: 'user-1',
          email: 'admin@test.com',
          name: 'Admin User',
          role: 'ADMIN',
          branchId: 'branch-1',
        }),
      })
    );
  });

  it('returns 401 when the user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const req = { body: { email: 'nobody@test.com', password: 'password123' } };
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid email or password' });
  });

  it('returns 401 when the password is wrong', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'admin@test.com',
      name: 'Admin',
      role: 'ADMIN',
      branchId: 'branch-1',
      isActive: true,
      password: hashPassword('correct-password'),
    });

    const req = { body: { email: 'admin@test.com', password: 'wrong-password' } };
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid email or password' });
  });

  it('returns 400 when email or password is missing', async () => {
    const req = { body: {} };
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Email and password are required' });
  });

  it('returns 401 when the user account is inactive', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'inactive@test.com',
      name: 'Inactive',
      role: 'SALES',
      branchId: null,
      isActive: false,
      password: hashPassword('password123'),
    });

    const req = { body: { email: 'inactive@test.com', password: 'password123' } };
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid email or password' });
  });

  it('does not include the password hash in the response', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'admin@test.com',
      name: 'Admin',
      role: 'ADMIN',
      branchId: 'branch-1',
      isActive: true,
      password: hashPassword('password123'),
    });

    const req = { body: { email: 'admin@test.com', password: 'password123' } };
    const res = mockRes();

    await login(req, res);

    const responseArg = res.json.mock.calls[0][0];
    expect(responseArg.user).not.toHaveProperty('password');
  });
});
