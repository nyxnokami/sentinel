import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import servicesRouter from './routes/services';
import { startWorker } from './workers/poller';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/services', servicesRouter);

app.get('/status', async (_req, res) => {
  const { getStatus } = await import('./lib/uptime');
  res.json(await getStatus());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sentinel running on port ${PORT}`);
  startWorker();
});