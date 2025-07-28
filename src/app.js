import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { errorHandler } from './middlewares/error.js';
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
  // The old RedisStore API expected a `client` property that exposed node-redis v3 style commands.
  // In node-redis v4 the command builder changed and certain chainable helpers like `pttl` were removed,
  // which is what caused the runtime error you saw: `multi(...).incr(...).pttl is not a function`.
  // The newer `rate-limit-redis` API lets us pass a minimal `sendCommand` wrapper that works with v4.
  store: new RedisStore({
    // Forward raw Redis commands to the underlying client
    sendCommand: (...args) => redis.sendCommand(args)
  })
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