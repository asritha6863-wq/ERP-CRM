/**
 * Migration script: back-fill Contacts from existing Leads.
 *
 * Run AFTER applying the new Prisma schema migrations:
 *   node scripts/migrate-contacts.js
 *
 * What it does:
 *   1. Seeds a default Company if none exists
 *   2. Seeds default ContactTypes if none exist
 *   3. Creates one Contact per unique (phone, companyId) from Lead data
 *   4. Flags duplicate phone contacts with isDuplicate=true
 *   5. Flags no-phone contacts with requiresReview=true
 *   6. Sets Lead.contactId, Lead.channel (from source.defaultChannel)
 *   7. Sets Deal.contactId via Lead → Contact chain
 *   8. Writes migration-report.csv listing all flagged rows
 */

import { PrismaClient } from '@prisma/client';
import { createWriteStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log(' Contact Migration Script');
  console.log('═══════════════════════════════════════════\n');

  // ── Step 1: Default Company ────────────────────────
  let company = await prisma.company.findFirst();
  if (!company) {
    company = await prisma.company.create({
      data: { name: 'Main Company' },
    });
    console.log(`✓ Created company: ${company.name}`);
  } else {
    console.log(`✓ Using existing company: ${company.name}`);
  }

  // Update existing branches to link to this company (if not already linked)
  const unlinkedBranches = await prisma.branch.findMany({ where: { companyId: null } });
  let linkedCount = 0;
  for (const branch of unlinkedBranches) {
    // Check if a branch with this name already exists under this company (created by seed)
    const duplicate = await prisma.branch.findFirst({
      where: { name: branch.name, companyId: company.id, NOT: { id: branch.id } },
    });
    if (duplicate) {
      // Delete the old unlinked branch — the seed already created a proper one
      await prisma.branch.delete({ where: { id: branch.id } });
    } else {
      await prisma.branch.update({
        where: { id: branch.id },
        data: { companyId: company.id },
      });
      linkedCount++;
    }
  }
  if (linkedCount) console.log(`✓ Linked ${linkedCount} branch(es) to company`);

  // ── Step 2: Default ContactTypes ───────────────────
  for (const name of ['Customer', 'Employee', 'Supplier']) {
    await prisma.contactType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log('✓ Seeded ContactTypes: Customer, Employee, Supplier');

  // ── Step 3: Back-fill Lead.channel from source ─────
  const sources = await prisma.leadSource.findMany();
  // Set defaultChannel for Walk-in/Walk In → INSTORE, rest → OUTDOOR
  for (const source of sources) {
    const isInstore = /walk.?in/i.test(source.name);
    await prisma.leadSource.update({
      where: { id: source.id },
      data: { defaultChannel: isInstore ? 'INSTORE' : 'OUTDOOR' },
    });
  }
  console.log('✓ Set defaultChannel on all LeadSources');

  // ── Step 4: Create Contacts from Leads ─────────────
  const leads = await prisma.lead.findMany({
    include: { source: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`\nProcessing ${leads.length} leads…`);

  const phoneMap = new Map(); // `${phone}__${companyId}` → contactId
  const report   = [];        // rows for the CSV report
  let   created  = 0;
  let   reused   = 0;

  for (const lead of leads) {
    // Normalise phone
    const rawPhone = lead.phone?.replace(/[\s\-().+]/g, '') || null;
    const key = rawPhone ? `${rawPhone}__${company.id}` : null;

    let contactId;

    if (key && phoneMap.has(key)) {
      // Duplicate phone — reuse existing, flag it
      contactId = phoneMap.get(key);
      await prisma.contact.update({
        where: { id: contactId },
        data: { isDuplicate: true },
      });
      report.push({
        leadId: lead.id,
        leadName: `${lead.firstName} ${lead.lastName}`,
        phone: rawPhone,
        contactId,
        reason: 'DUPLICATE_PHONE',
      });
      reused++;
    } else {
      // Create new contact
      const contact = await prisma.contact.create({
        data: {
          firstName:     lead.firstName,
          lastName:      lead.lastName,
          phone:         rawPhone,
          email:         lead.email,
          companyId:     company.id,
          branchId:      lead.branchId,
          assignedToId:  lead.assignedToId,
          requiresReview: !rawPhone,
          isDuplicate:   false,
        },
      });
      contactId = contact.id;
      if (key) phoneMap.set(key, contactId);
      if (!rawPhone) {
        report.push({
          leadId: lead.id,
          leadName: `${lead.firstName} ${lead.lastName}`,
          phone: '',
          contactId,
          reason: 'NO_PHONE',
        });
      }
      created++;
    }

    // Set contactId + channel on the lead
    const channel = lead.source?.defaultChannel ?? 'OUTDOOR';
    await prisma.lead.update({
      where: { id: lead.id },
      data: { contactId, channel },
    });
  }

  console.log(`✓ Contacts created: ${created}`);
  console.log(`✓ Contacts reused (duplicate phone): ${reused}`);

  // ── Step 5: Back-fill Deal.contactId ───────────────
  const deals = await prisma.deal.findMany({ include: { lead: true } });
  let dealsUpdated = 0;
  for (const deal of deals) {
    const contactId = deal.lead?.contactId;
    if (contactId && !deal.contactId) {
      await prisma.deal.update({
        where: { id: deal.id },
        data: { contactId },
      });
      dealsUpdated++;
    }
  }
  console.log(`✓ Deals updated with contactId: ${dealsUpdated}`);

  // ── Step 6: Write migration report CSV ─────────────
  if (report.length > 0) {
    const reportPath = join(__dirname, '..', 'migration-report.csv');
    const stream = createWriteStream(reportPath);
    stream.write('leadId,leadName,phone,contactId,reason\n');
    for (const row of report) {
      stream.write(`${row.leadId},"${row.leadName}",${row.phone},${row.contactId},${row.reason}\n`);
    }
    stream.end();
    console.log(`\n⚠  ${report.length} row(s) need review → migration-report.csv`);
  } else {
    console.log('\n✓ No duplicates or missing phones — no review needed');
  }

  console.log('\n═══════════════════════════════════════════');
  console.log(' Migration complete!');
  console.log('═══════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
