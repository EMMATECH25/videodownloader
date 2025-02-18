import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';

// Define the cookies file path
const COOKIES_PATH = path.join(__dirname, '..', '..', 'cookies.txt');

@Controller('upload')
export class UploadController {
  @Post('cookies')
  @UseInterceptors(FileInterceptor('file'))
  uploadCookies(@UploadedFile() file?: Express.Multer.File) {
    if (!file || !file.buffer) {
      return { error: 'No file uploaded or file buffer is empty' };
    }

    const isTextFile =
      file.mimetype === 'text/plain' || file.originalname.endsWith('.txt');
    if (!isTextFile) {
      return { error: 'Invalid file format. Please upload a .txt file' };
    }

    try {
      fs.writeFileSync(COOKIES_PATH, file.buffer);
      return { message: 'Cookies uploaded successfully' };
    } catch (error) {
      console.error('File write error:', error);
      return { error: 'Failed to save cookies file' };
    }
  }
}
