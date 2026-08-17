import fs from 'fs';
import cron from 'node-cron';
import { createApp } from './app';
import { env } from './config/env';
import { generateNotifications } from './services/notification.service';
import { prisma } from './lib/prisma';

if (!fs.existsSync(env.uploadDir)) {
  fs.mkdirSync(env.uploadDir, { recursive: true });
}

const app = createApp();

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[RPFMS backend] listening on port ${env.port} (${env.nodeEnv})`);
});

// Daily job (03:00) to compute BUDGET_LOW / BUDGET_OVER / PENDING_APPROVAL / PROJECT_ENDING notifications.
cron.schedule('0 3 * * *', async () => {
  try {
    const result = await generateNotifications();
    // eslint-disable-next-line no-console
    console.log('[notifications:cron] generated', result);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[notifications:cron] failed', err);
  }
});

async function shutdown(signal: string) {
  // eslint-disable-next-line no-console
  console.log(`[RPFMS backend] received ${signal}, shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
