import prisma from '../utils/prisma.js';

const CHANNELS = ['WHATSAPP', 'SMS', 'EMAIL', 'CALL'];

export async function listCampaigns(query) {
  const { page = 1, limit = 50 } = query;
  const take = Math.min(100, Math.max(1, +limit));
  const skip = (Math.max(1, +page) - 1) * take;

  const [items, total, sums] = await Promise.all([
    prisma.campaign.findMany({
      skip, take,
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { id: true, name: true } } },
    }),
    prisma.campaign.count(),
    prisma.campaign.aggregate({
      _sum: { sentCount: true, deliveredCount: true, convertedCount: true },
    }),
  ]);

  const sent      = sums._sum.sentCount      || 0;
  const delivered = sums._sum.deliveredCount || 0;
  const converted = sums._sum.convertedCount || 0;

  return {
    data: items, total, page: +page, limit: take, pages: Math.ceil(total / take),
    stats: {
      impressions:    sent,
      deliveryRate:   sent > 0 ? (delivered / sent) * 100 : null,
      conversionRate: delivered > 0 ? (converted / delivered) * 100 : null,
    },
  };
}

export async function createCampaign(user, data) {
  const { name, channel = 'WHATSAPP', targetSegment, scheduleDate, description } = data;
  if (!name?.trim()) throw { statusCode: 400, message: 'name is required' };
  if (!CHANNELS.includes(channel)) throw { statusCode: 400, message: `channel must be one of ${CHANNELS.join(', ')}` };

  let schedule = null;
  if (scheduleDate) {
    schedule = new Date(scheduleDate);
    if (Number.isNaN(schedule.getTime())) throw { statusCode: 400, message: 'scheduleDate is invalid' };
  }

  // Scheduled for a future date → SCHEDULED, otherwise ACTIVE
  const status = schedule && schedule > new Date() ? 'SCHEDULED' : 'ACTIVE';

  return prisma.campaign.create({
    data: {
      name:          name.trim(),
      channel,
      targetSegment: targetSegment || null,
      scheduleDate:  schedule,
      description:   description?.trim() || null,
      status,
      createdById:   user.id,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });
}
