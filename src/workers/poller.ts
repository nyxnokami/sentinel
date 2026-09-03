import cron from 'node-cron';
import { prisma } from '../db/client';

async function pingService(url: string): Promise<{ status: string; latency_ms: number | null }> {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const latency = Date.now() - start;
    return { status: res.ok ? 'up' : 'down', latency_ms: latency };
  } catch {
    clearTimeout(timeout);
    return { status: 'down', latency_ms: null };
  }
}

async function checkIncidents(serviceId: string) {
  const lastThree = await prisma.check.findMany({
    where: { service_id: serviceId },
    orderBy: { checked_at: 'desc' },
    take: 3,
  });

  const openIncident = await prisma.incident.findFirst({
    where: { service_id: serviceId, resolved_at: null },
  });

  const allThreeFailed = lastThree.length === 3 && lastThree.every((c) => c.status === 'down');
  const latestSucceeded = lastThree[0]?.status === 'up';

  if (allThreeFailed && !openIncident) {
    await prisma.incident.create({
      data: { service_id: serviceId, cause: '3 consecutive failed checks' },
    });
    console.log(`Incident opened for service ${serviceId}`);
  }

  if (latestSucceeded && openIncident) {
    await prisma.incident.update({
      where: { id: openIncident.id },
      data: { resolved_at: new Date() },
    });
    console.log(`Incident resolved for service ${serviceId}`);
  }
}

export async function runChecks() {
  const services = await prisma.service.findMany({ where: { is_active: true } });

  await Promise.allSettled(
    services.map(async (service) => {
      const result = await pingService(service.url);

      await prisma.check.create({
        data: {
          service_id: service.id,
          status: result.status,
          latency_ms: result.latency_ms,
        },
      });

      await checkIncidents(service.id);
    })
  );

  console.log(`Check cycle complete: ${services.length} services checked`);
}

export function startWorker() {
  cron.schedule('*/30 * * * * *', () => {
    runChecks().catch((err) => console.error('Worker error:', err));
  });
  console.log('Worker started — checking every 30 seconds');
}