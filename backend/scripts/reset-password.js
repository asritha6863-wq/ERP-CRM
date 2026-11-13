import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.update({
    where: { email: 'admin@jewellerycrm.com' },
    data: { password: hash, isActive: true },
  });
  console.log('✓ Password reset for:', user.email);
  console.log('  Login: admin@jewellerycrm.com / admin123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
