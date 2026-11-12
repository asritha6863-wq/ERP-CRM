import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ── Company ──────────────────────────────────────────
  const company = await prisma.company.upsert({
    where:  { name: 'Main Company' },
    update: {},
    create: { name: 'Main Company' },
  });
  console.log(`  ✓ Company: ${company.name}`);

  // ── Contact Types ────────────────────────────────────
  for (const name of ['Customer', 'Employee', 'Supplier']) {
    await prisma.contactType.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log('  ✓ ContactTypes: Customer, Employee, Supplier');

  // ── Branch ──────────────────────────────────────────
  const branch = await prisma.branch.upsert({
    where:  { name_companyId: { name: 'Main Branch', companyId: company.id } },
    update: {},
    create: {
      name:      'Main Branch',
      address:   '123 Jewellery Street, City Center',
      phone:     '+91 98765 43210',
      companyId: company.id,
    },
  });
  console.log(`  ✓ Branch: ${branch.name}`);

  // ── Admin User ──────────────────────────────────────
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where:  { email: 'admin@jewellerycrm.com' },
    update: {},
    create: {
      email:    'admin@jewellerycrm.com',
      password: hashedPassword,
      name:     'System Admin',
      role:     'ADMIN',
      branchId: branch.id,
    },
  });
  console.log(`  ✓ Admin user: ${admin.email}`);

  // ── Pipeline Stages ─────────────────────────────────
  const stages = ['Lead', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];
  for (let i = 0; i < stages.length; i++) {
    await prisma.pipelineStage.upsert({
      where:  { name: stages[i] },
      update: { order: i },
      create: { name: stages[i], order: i },
    });
  }
  console.log(`  ✓ Pipeline stages: ${stages.join(', ')}`);

  // ── Lead Statuses ───────────────────────────────────
  const statuses = [
    { name: 'New',       color: '#3b82f6' },
    { name: 'Contacted', color: '#f59e0b' },
    { name: 'Qualified', color: '#8b5cf6' },
    { name: 'Won',       color: '#10b981' },
    { name: 'Lost',      color: '#ef4444' },
  ];
  for (const status of statuses) {
    await prisma.leadStatus.upsert({
      where:  { name: status.name },
      update: { color: status.color },
      create: status,
    });
  }
  console.log(`  ✓ Lead statuses: ${statuses.map((s) => s.name).join(', ')}`);

  // ── Lead Sources ────────────────────────────────────
  const sourceData = [
    { name: 'Walk-in',        defaultChannel: 'INSTORE'  },
    { name: 'Referral',       defaultChannel: 'OUTDOOR'  },
    { name: 'Online',         defaultChannel: 'OUTDOOR'  },
    { name: 'Social Media',   defaultChannel: 'OUTDOOR'  },
    { name: 'Phone Inquiry',  defaultChannel: 'OUTDOOR'  },
    { name: 'Door to Door',   defaultChannel: 'OUTDOOR'  },
    { name: 'Mass Marketing', defaultChannel: 'OUTDOOR'  },
    { name: 'Campaign',       defaultChannel: 'OUTDOOR'  },
  ];
  for (const source of sourceData) {
    await prisma.leadSource.upsert({
      where:  { name: source.name },
      update: { defaultChannel: source.defaultChannel },
      create: source,
    });
  }
  console.log(`  ✓ Lead sources: ${sourceData.map((s) => s.name).join(', ')}`);

  // ── Lost Reasons ────────────────────────────────────
  const lostReasons = [
    'Price too high', 'Went to competitor', 'Not interested',
    'Budget constraints', 'Lost contact',
  ];
  for (const reason of lostReasons) {
    await prisma.lostReason.upsert({ where: { name: reason }, update: {}, create: { name: reason } });
  }
  console.log(`  ✓ Lost reasons: ${lostReasons.join(', ')}`);

  // ── Customer Categories ─────────────────────────────
  const categories = ['Regular', 'VIP', 'Wholesale', 'New Customer'];
  for (const category of categories) {
    await prisma.customerCategory.upsert({ where: { name: category }, update: {}, create: { name: category } });
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
