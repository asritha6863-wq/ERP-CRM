import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ── Branch ──────────────────────────────────────────
  const branch = await prisma.branch.create({
    data: {
      name: 'Main Branch',
      address: '123 Jewellery Street, City Center',
      phone: '+91 98765 43210',
    },
  });
  console.log(`  ✓ Branch: ${branch.name}`);

  // ── Admin User ──────────────────────────────────────
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@jewellerycrm.com',
      password: hashedPassword,
      name: 'System Admin',
      role: 'ADMIN',
      branchId: branch.id,
    },
  });
  console.log(`  ✓ Admin user: ${admin.email}`);

  // ── Pipeline Stages ─────────────────────────────────
  const stages = [
    'Lead',
    'Contacted',
    'Qualified',
    'Proposal',
    'Negotiation',
    'Won',
    'Lost',
  ];
  for (let i = 0; i < stages.length; i++) {
    await prisma.pipelineStage.create({
      data: { name: stages[i], order: i },
    });
  }
  console.log(`  ✓ Pipeline stages: ${stages.join(', ')}`);

  // ── Lead Statuses ───────────────────────────────────
  const statuses = [
    { name: 'New', color: '#3b82f6' },
    { name: 'Contacted', color: '#f59e0b' },
    { name: 'Qualified', color: '#8b5cf6' },
    { name: 'Won', color: '#10b981' },
    { name: 'Lost', color: '#ef4444' },
  ];
  for (const status of statuses) {
    await prisma.leadStatus.create({ data: status });
  }
  console.log(`  ✓ Lead statuses: ${statuses.map((s) => s.name).join(', ')}`);

  // ── Lead Sources ────────────────────────────────────
  const sources = ['Walk-in', 'Referral', 'Online', 'Social Media', 'Phone Inquiry'];
  for (const source of sources) {
    await prisma.leadSource.create({ data: { name: source } });
  }
  console.log(`  ✓ Lead sources: ${sources.join(', ')}`);

  // ── Lost Reasons ────────────────────────────────────
  const lostReasons = [
    'Price too high',
    'Went to competitor',
    'Not interested',
    'Budget constraints',
    'Lost contact',
  ];
  for (const reason of lostReasons) {
    await prisma.lostReason.create({ data: { name: reason } });
  }
  console.log(`  ✓ Lost reasons: ${lostReasons.join(', ')}`);

  // ── Customer Categories ─────────────────────────────
  const categories = ['Regular', 'VIP', 'Wholesale', 'New Customer'];
  for (const category of categories) {
    await prisma.customerCategory.create({ data: { name: category } });
  }
  console.log(`  ✓ Customer categories: ${categories.join(', ')}`);

  console.log('\nSeed completed successfully!');
  console.log('Login: admin@jewellerycrm.com / admin123');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
