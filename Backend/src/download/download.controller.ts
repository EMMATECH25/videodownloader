import { Controller, Get, Query, Res, Inject } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ytdlp from 'yt-dlp-exec';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import * as Sentry from '@sentry/node'; // ✅ Added Sentry import

const COOKIES_PATH = path.join(__dirname, '..', '..', 'cookies.txt');

ffmpeg.setFfmpegPath('/usr/bin/ffmpeg');

@Controller('download')
export class DownloadController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  @Get()
  async downloadVideo(
    @Query('url') url: string,
    @Res() res: Response,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    this.logger.info(`🔄 New Download Request: ${url}`);

    if (!url) {
      this.logger.warn('❌ Error: No URL provided');
      return res.status(400).json({ error: 'Please provide a video URL!' });
    }

    const tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'temp_'));
    this.logger.info(`📂 Temporary Directory Created: ${tmpDir}`);

    const timestamp = Date.now();
    const originalVideoPath = path.join(tmpDir, `video_${timestamp}.mp4`);
    const processedVideoPath = path.join(tmpDir, `processed_${timestamp}.mp4`);

    this.logger.info(
      `📄 Filenames: Original: ${originalVideoPath}, Processed: ${processedVideoPath}`,
    );

    try {
      this.logger.info(`🖥 Executing yt-dlp-exec...`);

      const ytDlpArgs = {
        output: originalVideoPath,
        format: 'bv*+ba/b',
        mergeOutputFormat: 'mp4',
        hlsPreferFfmpeg: true,
      };

      if (fs.existsSync(COOKIES_PATH)) {
        this.logger.info(`🔐 Using cookies: ${COOKIES_PATH}`);
        ytDlpArgs['cookies'] = COOKIES_PATH;
      }

      await ytdlp.exec(url, ytDlpArgs);
      this.logger.info(`✅ yt-dlp Download Completed!`);

      if (!fs.existsSync(originalVideoPath)) {
        const errorMessage = '❌ Download failed: File was not created.';
        this.logger.error(errorMessage);
        Sentry.captureMessage(errorMessage); // ✅ Capture message in Sentry
        return res
          .status(500)
          .json({ error: 'Download failed. Please try again.' });
      }

      let finalVideoPath = processedVideoPath;
      let ffmpegCommand = ffmpeg(originalVideoPath).outputOptions([
        '-y',
        '-c:v libx264',
        '-preset ultrafast',
        '-crf 30',
        '-c:a aac',
        '-b:a 128k',
        '-movflags +faststart',
      ]);

      const startTime = start ? parseInt(start, 10) : null;
      const endTime = end ? parseInt(end, 10) : null;

      if (startTime !== null || endTime !== null) {
        finalVideoPath = path.join(tmpDir, `trimmed_${timestamp}.mp4`);
        ffmpegCommand = ffmpegCommand.input(originalVideoPath);
        if (startTime !== null)
          ffmpegCommand = ffmpegCommand.setStartTime(startTime);
        if (endTime !== null)
          ffmpegCommand = ffmpegCommand.setDuration(endTime - (startTime || 0));
      }

      const processingSuccess = await new Promise<boolean>((resolve) => {
        ffmpegCommand
          .output(finalVideoPath)
          .on('start', (cmd) =>
            this.logger.info(`🎬 FFmpeg processing started: ${cmd}`),
          )
          .on('progress', (progress) =>
            this.logger.info(`⏳ Progress: ${progress.percent || '0'}%`),
          )
          .on('end', () => {
            this.logger.info(`✅ Processing complete: ${finalVideoPath}`);
            resolve(true);
          })
          .on('error', (err: Error) => {
            this.logger.error(`❌ Processing error: ${err.message}`);
            Sentry.captureException(err); // ✅ Capture error in Sentry
            resolve(false);
          })
          .run();
      });

      if (!processingSuccess || !fs.existsSync(finalVideoPath)) {
        const errorMessage = '❌ Video processing failed.';
        this.logger.error(errorMessage);
        Sentry.captureMessage(errorMessage); // ✅ Capture message in Sentry
        return res.status(500).json({ error: 'Video processing failed.' });
      }

      this.logger.info(`📤 Sending file to user: ${finalVideoPath}`);
      res.download(finalVideoPath, `downloaded_${timestamp}.mp4`, (err) => {
        if (err) {
          this.logger.error(`❌ File download error: ${err.message}`);
          Sentry.captureException(err); // ✅ Capture error in Sentry
        } else {
          this.logger.info(
            `✅ File successfully sent to user: ${finalVideoPath}`,
          );
        }

        // Cleanup files after sending
        this.cleanupFiles([finalVideoPath, originalVideoPath, tmpDir]);
      });
    } catch (error) {
      this.logger.error(
        `❌ Error: ${error instanceof Error ? error.message : error}`,
      );

      // ✅ Capture the error in Sentry with additional context
      Sentry.withScope((scope) => {
        scope.setContext('DownloadController', {
          url,
          start,
          end,
        });
        Sentry.captureException(error);
      });

      return res
        .status(500)
        .json({ error: 'Failed to download and process video' });
    }
  }

  private cleanupFiles(files: string[]) {
    files.forEach((filePath) => {
      fs.rm(filePath, { recursive: true, force: true }, (err) => {
        if (err) {
          this.logger.error(`❌ Error deleting ${filePath}: ${err.message}`);
          Sentry.captureException(err); // ✅ Capture file deletion error in Sentry
        } else {
          this.logger.info(`🗑 Deleted: ${filePath}`);
        }
      });
    });
  }
}
