import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './config/env';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { auditLogger } from './middleware/auditLog';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin.split(',').map((o) => o.trim()),
      credentials: true,
    })
  );
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Static file serving for uploaded receipts/attachments
  app.use('/uploads', express.static(env.uploadDir));

  app.use(auditLogger);

  app.use('/api/v1', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

// Also export the file server root so other modules (multer, ocr) can resolve absolute paths consistently.
export const uploadsRoot = path.resolve(env.uploadDir);
