import { PrismaClient } from '@prisma/client';

// Singleton pattern to avoid multiple PrismaClient instances in dev
const prisma = new PrismaClient();

export default prisma;
