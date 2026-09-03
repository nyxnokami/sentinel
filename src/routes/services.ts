import { Router } from 'express';
import { prisma } from '../db/client';
import { apiKeyAuth } from '../middleware/auth';

const router = Router();

router.get('/', async (_req, res) => {
  const services = await prisma.service.findMany();
  res.json(services);
});

router.post('/', apiKeyAuth, async (req, res) => {
  const { name, url, check_interval_seconds } = req.body;
  const service = await prisma.service.create({
    data: { name, url, check_interval_seconds: check_interval_seconds ?? 60 },
  });
  res.status(201).json(service);
});

router.delete('/:id', apiKeyAuth, async (req, res) => {
  const id = String(req.params.id);
  await prisma.service.delete({ where: { id } });
  res.status(204).send();
});

router.get('/:id/checks', async (req, res) => {
  const id = String(req.params.id);
  const range = req.query.range ?? '24h';
  const hours = parseInt(String(range).replace('h', '')) || 24;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const checks = await prisma.check.findMany({
    where: { service_id: id, checked_at: { gte: since } },
    orderBy: { checked_at: 'asc' },
  });
  res.json(checks);
});

router.get('/:id/incidents', async (req, res) => {
  const id = String(req.params.id);
  const incidents = await prisma.incident.findMany({
    where: { service_id: id },
    orderBy: { started_at: 'desc' },
  });
  res.json(incidents);
});

export default router;