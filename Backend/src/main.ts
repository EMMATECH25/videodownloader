import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration as ProfilingIntegration } from '@sentry/profiling-node';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as path from 'path';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '@nestjs/common';
import * as dotenv from 'dotenv';

dotenv.config();

// ✅ Initialize Sentry before the app starts
Sentry.init({
  dsn: process.env.SENTRY_DSN, // Ensure you have this in your .env file
  integrations: [ProfilingIntegration()],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp }) => {
              return `[${typeof timestamp === 'string' ? timestamp : new Date().toISOString()}] ${level}: ${
                typeof message === 'string' ? message : JSON.stringify(message)
              }`;
            }),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    }),
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    Sentry.captureMessage(`Request: ${req.method} ${req.url}`);
    next();
  });

  // Removed invalid transaction logic as Sentry.startTransaction is not available in @sentry/node
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    Sentry.captureException(err);
    next(err);
  });

  // ✅ Set API global prefix
  app.setGlobalPrefix('api');

  // ✅ Enable CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
  });

  // ✅ Serve frontend static files **but do NOT intercept API routes**
  const frontendPath = path.join(__dirname, '..', 'public');
  app.useStaticAssets(frontendPath);

  // ✅ Handle API requests **before serving the frontend UI**
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/download')) {
      return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });

  // ✅ Attach Sentry error handler at the end
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    Sentry.captureException(err);
    next(err);
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  const logger = app.get<LoggerService>(WINSTON_MODULE_NEST_PROVIDER);
  logger.log(`🚀 Server running on http://localhost:${port}`);
}

// ✅ Global error handling
bootstrap().catch((error) => {
  Sentry.captureException(error);
  const logger = WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.printf(({ level, message, timestamp }) => {
            return `[${typeof timestamp === 'string' ? timestamp : new Date().toISOString()}] ${level}: ${
              typeof message === 'string' ? message : JSON.stringify(message)
            }`;
          }),
        ),
      }),
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    ],
  });

  logger.error('❌ Error during bootstrap:', error);
});
