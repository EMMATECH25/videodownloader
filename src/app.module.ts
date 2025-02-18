import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DownloadController } from './download/download.controller';
import { UploadController } from './upload.controller'; // Import from a separate file

@Module({
  imports: [],
  controllers: [AppController, DownloadController, UploadController],
  providers: [AppService],
})
export class AppModule {}
