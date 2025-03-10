import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as ffmpeg from 'fluent-ffmpeg';

const BIN_PATH = path.join(__dirname, '..', '..', 'bin');
const YT_DLP_PATH = path.join(BIN_PATH, 'yt-dlp');
const FFMPEG_PATH = path.join(BIN_PATH, 'ffmpeg');
const COOKIES_PATH = path.join(__dirname, '..', '..', 'cookies.txt');

ffmpeg.setFfmpegPath(FFMPEG_PATH);

@Controller('download')
export class DownloadController {
  @Get()
  async downloadVideo(
    @Query('url') url: string,
    @Res() res: Response,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    console.log(`\n🔄 NEW DOWNLOAD REQUEST`);
    console.log(`🌐 URL: ${url}`);
    console.log(`🕒 Received at: ${new Date().toISOString()}`);

    if (!url) {
      console.log('❌ Error: No URL provided');
      return res.status(400).json({ error: 'Please provide a video URL!' });
    }

    try {
      const outputPath = path.join(__dirname, '..', '..', 'downloads');
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
      }

      const timestamp = Date.now();
      const originalVideoPath = path.join(
        outputPath,
        `original_${timestamp}.mp4`,
      );
      const processedVideoPath = path.join(
        outputPath,
        `processed_${timestamp}.mp4`,
      );

      console.log(`📂 Output Path: ${outputPath}`);
      console.log(
        `📄 Generated Filenames:\n   - Original: ${originalVideoPath}\n   - Processed: ${processedVideoPath}`,
      );

      console.log(`🚀 Deleting old files before download`);
      fs.readdirSync(outputPath).forEach((file) => {
        if (file.startsWith('original_') || file.startsWith('processed_')) {
          const filePath = path.join(outputPath, file);
          fs.unlinkSync(filePath);
          console.log(`🗑 Deleted: ${filePath}`);
        }
      });

      let ytDlpCommand = `${YT_DLP_PATH} -o "${originalVideoPath}" -f "bv*+ba/b" --merge-output-format mp4 --no-mtime --hls-prefer-ffmpeg "${url}"`;

      if (fs.existsSync(COOKIES_PATH)) {
        console.log('🔐 Using cookies:', COOKIES_PATH);
        ytDlpCommand = `${YT_DLP_PATH} --cookies "${COOKIES_PATH}" -o "${originalVideoPath}" -f bestvideo+bestaudio/best --merge-output-format mp4 "${url}"`;
      }

      console.log(`🖥 Executing command:\n   ${ytDlpCommand}`);

      await new Promise<void>((resolve, reject) => {
        exec(ytDlpCommand, (error, stdout, stderr) => {
          if (error) {
            console.error('❌ yt-dlp error:', error.message);
            reject(new Error('Download failed. Please try again.'));
            return;
          }
          console.log(stdout || stderr);
          resolve();
        });
      });

      if (!fs.existsSync(originalVideoPath)) {
        console.error('❌ Download failed: File was not created.');
        throw new Error('Download failed: File was not created.');
      }

      console.log(`✅ Download complete: ${originalVideoPath}`);

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
        finalVideoPath = path.join(outputPath, `trimmed_${timestamp}.mp4`);
        ffmpegCommand = ffmpegCommand.input(originalVideoPath);
        if (startTime !== null) {
          ffmpegCommand = ffmpegCommand.setStartTime(startTime);
        }
        if (endTime !== null) {
          ffmpegCommand = ffmpegCommand.setDuration(endTime - (startTime || 0));
        }
      }

      await new Promise<void>((resolve, reject) => {
        ffmpegCommand
          .output(finalVideoPath)
          .on('start', (cmd) => console.log(`🎬 FFmpeg processing:\n   ${cmd}`))
          .on('progress', (progress) =>
            console.log(`⏳ Progress: ${progress.percent || '0'}%`),
          )
          .on('end', () => {
            console.log(`✅ Processing complete: ${finalVideoPath}`);
            resolve();
          })
          .on('error', (err: Error) => {
            console.error('❌ Processing error:', err.message);
            reject(err);
          })
          .run();
      });

      console.log(`📤 Sending file to user: ${finalVideoPath}`);
      res.download(finalVideoPath, `downloaded_${timestamp}.mp4`);

      setTimeout(
        () => {
          if (fs.existsSync(originalVideoPath))
            fs.unlinkSync(originalVideoPath);
          if (fs.existsSync(finalVideoPath)) fs.unlinkSync(finalVideoPath);
          console.log(
            `🗑 Deleted files: ${originalVideoPath}, ${finalVideoPath}`,
          );
        },
        5 * 60 * 1000,
      );
    } catch (error) {
      console.error(
        '❌ Error:',
        error instanceof Error ? error.message : error,
      );
      return res
        .status(500)
        .json({ error: 'Failed to download and process video' });
    }
  }
}
