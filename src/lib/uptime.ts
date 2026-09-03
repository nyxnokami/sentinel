import { prisma } from '../db/client';

export async function getStatus() {
  const services = await prisma.service.findMany({ where: { is_active: true } });

  const results = await Promise.all(
    services.map(async (service) => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const recentChecks = await prisma.check.findMany({
        where: { service_id: service.id, checked_at: { gte: since } },
        orderBy: { checked_at: 'desc' },
      });

      const total = recentChecks.length;
      const upCount = recentChecks.filter((c) => c.status === 'up').length;
      const uptimePercent = total > 0 ? Math.round((upCount / total) * 1000) / 10 : 100;

      const lastCheck = recentChecks[0];

      return {
        id: service.id,
        name: service.name,
        url: service.url,
        status: lastCheck ? lastCheck.status : 'unknown',
        uptime_percent: uptimePercent,
        last_checked_at: lastCheck ? lastCheck.checked_at : null,
      };
    })
  );

  return results;
}