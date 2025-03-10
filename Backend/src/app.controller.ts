import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';

@Controller()
export class AppController {
  @Get()
  getFrontend(@Res() res: Response) {
    const filePath = join(__dirname, '..', 'public', 'index.html');
    console.log(`Serving file from: ${filePath}`);
    res.sendFile(filePath);
  }
}
