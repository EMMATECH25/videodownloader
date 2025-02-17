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

      const originalVideoPath: string = path.join(
        outputPath,
        'original_video.mp4',
      );
      const convertedVideoPath: string = path.join(
        outputPath,
        'converted_video.mp4',
      );

      console.log('Downloading video...');
      const ytDlpCommand = `${YT_DLP_PATH} -o "${originalVideoPath}" -f best "${url}"`;
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

      console.log('Checking if download was successful...');
      if (!fs.existsSync(originalVideoPath)) {
        throw new Error('Download failed: File was not created.');
      }
      console.log('Download confirmed, proceeding with conversion...');

      await new Promise<void>((resolve, reject) => {
        ffmpeg(originalVideoPath)
          .inputOptions('-y')
          .outputOptions([
            '-y',
            '-c:v libx264',
            '-preset fast',
            '-c:a aac',
            '-b:a 128k',
          ])
          .output(convertedVideoPath)
          .videoCodec('libx264')
          .audioCodec('aac')
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
        console.log(
          'Download response sent. Cleaning up files in 5 seconds...',
        );
        setTimeout(() => {
          try {
            if (fs.existsSync(originalVideoPath)) {
              fs.unlinkSync(originalVideoPath);
              console.log('Deleted:', originalVideoPath);
            }
            if (fs.existsSync(convertedVideoPath)) {
              fs.unlinkSync(convertedVideoPath);
              console.log('Deleted:', convertedVideoPath);
            }
          } catch (cleanupError) {
            console.error('Error during file cleanup:', cleanupError);
          }
        }, 5000);
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error:', error.message);
      } else {
        console.error('Unexpected error:', error);
      }

      return res
        .status(500)
        .json({ error: 'Failed to download and convert video' });
    }
  }
}
