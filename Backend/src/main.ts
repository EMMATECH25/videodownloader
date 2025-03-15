import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ✅ Set API global prefix
  app.setGlobalPrefix('api'); // Ensures all API routes start with /api

  // ✅ Enable CORS
  app.enableCors({
    origin: '*', // Allow all origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
  });

  // ✅ Serve frontend static files **but do NOT intercept API routes**
  const frontendPath = path.join(__dirname, '..', 'public');
  app.useStaticAssets(frontendPath);

  // ✅ Handle API requests **before serving the frontend UI**
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/download')) {
      return next(); // Let API requests go through
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });

  const port = process.env.PORT || 10000;
  await app.listen(port);
  Logger.log(`🚀 Server running on http://localhost:${port}`);
}

bootstrap().catch((error) => {
  Logger.error('❌ Error during bootstrap:', error);
});
