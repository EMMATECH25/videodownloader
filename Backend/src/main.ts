import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(); // Add global exception handling if needed

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
