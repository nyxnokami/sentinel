import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import servicesRouter from './routes/services';
import { startWorker } from './workers/poller';

dotenv.config();

const app = express();

app.use(cors({
  origin:[
    "http://localhost:5173",
    "https://818f51a1.sentinel-dashboard-6kj.pages.dev/"
  ],
  methods:['GET','POST','DELETE'],
  credentials:true,
  allowedHeaders:['Content-Type','Authorization']
}));

app.use(express.json());

app.get('/', (req,res) => {
  res.send('Sentinel API Server is running and connected to Neon Database!');
});

app.use((req, res, next) =>{
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
    return res.status(200).json({});
  }
  next();
})
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