import app, { logger } from './app.js';
import { env } from './config/env.js';

const server = app.listen(env.PORT, () => {
  logger.info(`Server listening on http://localhost:${env.PORT}`);
});

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM'];
for (const sig of signals) {
  process.on(sig, () => {
    logger.info({ sig }, 'Shutting down');
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  });
} 