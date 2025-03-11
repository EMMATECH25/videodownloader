import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import { Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS
  app.enableCors();

  // Serve frontend build from backend/public
  app.useStaticAssets(path.join(__dirname, '..', 'public'));

  // **Set API Global Prefix**
  app.setGlobalPrefix('api'); // All API routes will now be under `/api/`

  // Redirect all other requests to frontend (index.html)
  app.use('*', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`🚀 Server running on http://localhost:${port}`);
}

bootstrap().catch((error) => {
  Logger.error('Error during bootstrap', error);
});
