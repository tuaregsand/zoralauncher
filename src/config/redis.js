import { createClient } from 'redis';
import { env } from './env.js';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export const redis = createClient({ url: env.REDIS_URL });

redis.on('error', (err) => logger.error(err, 'Redis error'));

await redis.connect();
logger.info('Redis connected'); 