import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import { Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS (if needed)
  app.enableCors();

  // Serve frontend build from backend/public
  app.useStaticAssets(path.join(__dirname, '..', 'public'));

  // **Log all registered routes before starting the server**
  const expressInstance = app
    .getHttpAdapter()
    .getInstance() as import('express').Application;
  const router = expressInstance._router as import('express').Router; // Get Express Router

  interface RouteLayer {
    route?: {
      methods: { [method: string]: boolean };
      path: string;
    };
  }

  interface Route {
    method: string;
    path: string;
  }

  const routes: Route[] = (router.stack as unknown as RouteLayer[])
    .filter((layer: RouteLayer) => layer.route !== undefined) // Filter only route handlers
    .map((layer: RouteLayer) => ({
      method: Object.keys(layer.route!.methods)[0].toUpperCase(),
      path: layer.route!.path,
    }));

  Logger.log('Registered Routes:', 'Bootstrap');
  console.table(routes); // Print the routes in a table format

  // Redirect all other requests to frontend (index.html)
  app.use('*', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`🚀 Server running on http://localhost:${port}`);
}

// Safe error handling
process.on('uncaughtException', (error: unknown) => {
  if (error instanceof Error) {
    Logger.error(`Uncaught Exception: ${error.message}`, error.stack);
  } else {
    Logger.error(`Uncaught Exception:`, error);
  }
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
  Logger.error(`Unhandled Rejection at:`, promise, 'Reason:', reason);
});

bootstrap().catch((error) => {
  Logger.error('Error during bootstrap', error);
});
