import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middlewares/error.js';
import RedisStore from 'rate-limit-redis';
import { redis } from './config/redis.js';
import pino from 'pino';

import { env } from './config/env.js';

// Logger
export const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

import launchRouter from './routes/launch.js';
import { initWallet } from './services/zora.js';

const app = express();

// -------------------------------- Middleware --------------------------------
app.use(helmet());

const allowedOrigins = [
  'http://localhost',
  'http://localhost:3000',
  'https://www.incrypt.net',
  'https://app.incrypt.net'
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  }
}));

app.use(express.json());

const launchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ client: redis })
});

// Simple API key middleware
function checkApiKey(req, res, next) {
  if (!env.API_KEY) return next();
  if (req.headers['x-api-key'] !== env.API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
}

// -------------------------------- Routes ------------------------------------
app.use('/api/launch', launchLimiter, checkApiKey, launchRouter);

app.get('/api/health', (_req, res) => {
  const { account } = initWallet();
  res.json({ status: 'ok', wallet: account?.address });
});

// Global error handler (must be last)
app.use(errorHandler);

export default app; 