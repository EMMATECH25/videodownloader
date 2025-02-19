import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as ffmpeg from 'fluent-ffmpeg';

// Define absolute paths for binaries
const BIN_PATH = path.join(__dirname, '..', '..', 'bin');
const YT_DLP_PATH = path.join(BIN_PATH, 'yt-dlp');
const FFMPEG_PATH = path.join(BIN_PATH, 'ffmpeg');
const FFPROBE_PATH = path.join(BIN_PATH, 'ffprobe');
const COOKIES_PATH = path.join(__dirname, '..', '..', 'cookies.txt');

// Install log file path
const INSTALL_LOG_PATH = path.join(BIN_PATH, 'install_log.txt');

ffmpeg.setFfmpegPath(FFMPEG_PATH);
ffmpeg.setFfprobePath(FFPROBE_PATH);

@Controller('download')
export class DownloadController {
  @Get()
  async downloadVideo(@Query('url') url: string, @Res() res: Response) {
    if (!url) {
      return res.status(400).json({ error: 'Please provide a video URL!' });
    }

    try {
      const outputPath = path.join(__dirname, '..', '..', 'downloads');
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
      }

      const originalVideoPath = path.join(outputPath, 'original_video.mp4');
      const convertedVideoPath = path.join(outputPath, 'converted_video.mp4');

      console.log('Downloading video...');
      let ytDlpCommand = `${YT_DLP_PATH} -o "${originalVideoPath}" -f "bv*+ba/b" --merge-output-format mp4 --no-mtime --hls-prefer-ffmpeg "${url}"`;

      if (fs.existsSync(COOKIES_PATH)) {
        console.log('Using cookies file for authentication:', COOKIES_PATH);
        ytDlpCommand = `${YT_DLP_PATH} --cookies "${COOKIES_PATH}" -o "${originalVideoPath}" -f bestvideo+bestaudio/best --merge-output-format mp4 "${url}"`;
      } else {
        console.warn('Warning: cookies.txt not found, downloading may fail.');
      }

      console.log('Executing command:', ytDlpCommand);

      await new Promise<void>((resolve, reject) => {
        exec(ytDlpCommand, (error, stdout, stderr) => {
          if (error) {
            console.error('yt-dlp error:', error.message);
            return reject(error);
          }
          console.log(stdout || stderr);
          resolve();
        });
      });

      if (!fs.existsSync(originalVideoPath)) {
        throw new Error('Download failed: File was not created.');
      }

      console.log('Download complete, proceeding with conversion...');

      await new Promise<void>((resolve, reject) => {
        ffmpeg(originalVideoPath)
          .outputOptions([
            '-y',
            '-c:v libx264',
            '-preset ultrafast', // Faster encoding, less CPU usage
            '-crf 30', // Slightly lower quality but reduces load
            '-c:a copy', // Avoids unnecessary audio re-encoding
          ])
          .output(convertedVideoPath)
          .on('start', (cmd) => console.log('FFmpeg command:', cmd))
          .on('progress', (progress) => console.log('Progress:', progress))
          .on('end', () => {
            console.log('Conversion complete.');
            resolve();
          })
          .on('error', (err: Error) => {
            console.error('Conversion error:', err.message);
            reject(err);
          })
          .run();
      });

      console.log('Sending converted video...');
      res.download(convertedVideoPath, 'downloaded_video.mp4', (err) => {
        if (err) {
          console.error('Download error:', err);
          res.status(500).json({ error: 'Error downloading the video' });
        }

        setTimeout(() => {
          try {
            if (fs.existsSync(originalVideoPath))
              fs.unlinkSync(originalVideoPath);
            if (fs.existsSync(convertedVideoPath))
              fs.unlinkSync(convertedVideoPath);
          } catch (cleanupError) {
            console.error('Error during file cleanup:', cleanupError);
          }
        }, 5000);
      });
    } catch (error: unknown) {
      console.error('Error:', error instanceof Error ? error.message : error);
      return res
        .status(500)
        .json({ error: 'Failed to download and convert video' });
    }
  }

  // New endpoint to read the install log
  @Get('install-log')
  getInstallLog(@Res() res: Response) {
    if (fs.existsSync(INSTALL_LOG_PATH)) {
      const logContent = fs.readFileSync(INSTALL_LOG_PATH, 'utf8');
      return res.send(`<pre>${logContent}</pre>`);
    } else {
      return res.status(404).json({ error: 'Log file not found' });
    }
  }
}
