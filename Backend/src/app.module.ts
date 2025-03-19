import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DownloadController } from './download/download.controller';
import { UploadController } from './upload.controller';

@Module({
  imports: [
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(
              ({
                level,
                message,
                timestamp,
              }: {
                level: string;
                message: any;
                timestamp?: string;
              }) => {
                const safeTimestamp = timestamp ?? new Date().toISOString(); // Ensure timestamp is valid
                const safeMessage =
                  typeof message === 'string'
                    ? message
                    : JSON.stringify(message); // Ensure message is a string
                return `[${safeTimestamp}] ${level}: ${safeMessage}`;
              },
            ),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/app.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    }),
  ],
  controllers: [AppController, DownloadController, UploadController],
  providers: [AppService],
})
export class AppModule {}
