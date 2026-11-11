import { verifyToken } from '../utils/jwt.js';
import prisma from '../utils/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Verifies the JWT from the Authorization header and attaches the user to req.user
export const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = header.split(' ')[1];

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Fetch the user from DB to ensure they're still active
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      branchId: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Account not found or disabled' });
  }

  req.user = user;
  next();
});
