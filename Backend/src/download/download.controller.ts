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

@Controller('api/download') // ✅ Updated to match your global prefix
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

    // **Set No-Cache Headers**
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate',
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    if (!url) {
      console.log('❌ Error: No URL provided');
      return res.status(400).json({ error: 'Please provide a video URL!' });
    }

    try {
      const outputPath = path.join(__dirname, '..', '..', 'downloads');

      // **Clear previous video files**
      fs.readdirSync(outputPath).forEach((file) => {
        const filePath = path.join(outputPath, file);
        fs.unlinkSync(filePath);
        console.log(`🗑 Deleted old file: ${filePath}`);
      });

      const timestamp = Date.now();
      const originalVideoPath = path.join(outputPath, `video_${timestamp}.mp4`);
      const processedVideoPath = path.join(
        outputPath,
        `processed_${timestamp}.mp4`,
      );

      console.log(`📂 Output Path: ${outputPath}`);
      console.log(
        `📄 Generated Filenames: ${originalVideoPath}, ${processedVideoPath}`,
      );

      let ytDlpCommand = `${YT_DLP_PATH} -o "${originalVideoPath}" -f "bv*+ba/b" --merge-output-format mp4 --no-mtime --hls-prefer-ffmpeg "${url}"`;

      if (fs.existsSync(COOKIES_PATH)) {
        console.log('🔐 Using cookies:', COOKIES_PATH);
        ytDlpCommand = `${YT_DLP_PATH} --cookies "${COOKIES_PATH}" -o "${originalVideoPath}" -f bestvideo+bestaudio/best --merge-output-format mp4 "${url}"`;
      }

      console.log(`🖥 Executing yt-dlp command:\n   ${ytDlpCommand}`);

      const downloadSuccess = await new Promise<boolean>((resolve) => {
        exec(ytDlpCommand, (error, stdout, stderr) => {
          console.log('📄 yt-dlp Output:', stdout);
          console.log('⚠ yt-dlp Errors:', stderr);

          if (error) {
            console.error('❌ yt-dlp Execution Error:', error.message);
            resolve(false);
            return;
          }

          console.log(`✅ yt-dlp Download Completed!`);
          resolve(true);
        });
      });

      if (!downloadSuccess || !fs.existsSync(originalVideoPath)) {
        console.error('❌ Download failed: File was not created.');
        return res
          .status(500)
          .json({ error: 'Download failed. Please try again.' });
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

      const processingSuccess = await new Promise<boolean>((resolve) => {
        ffmpegCommand
          .output(finalVideoPath)
          .on('start', (cmd) => console.log(`🎬 FFmpeg processing:\n   ${cmd}`))
          .on('progress', (progress) =>
            console.log(`⏳ Progress: ${progress.percent || '0'}%`),
          )
          .on('end', () => {
            console.log(`✅ Processing complete: ${finalVideoPath}`);
            resolve(true);
          })
          .on('error', (err: Error) => {
            console.error('❌ Processing error:', err.message);
            resolve(false);
          })
          .run();
      });

      if (!processingSuccess || !fs.existsSync(finalVideoPath)) {
        console.error('❌ Video processing failed.');
        return res.status(500).json({ error: 'Video processing failed.' });
      }

      console.log(`📤 Sending file to user: ${finalVideoPath}`);
      res.download(finalVideoPath, `downloaded_${timestamp}.mp4`);

      // **Step 5: Cleanup - Delete files after sending**
      setTimeout(
        () => {
          [originalVideoPath, finalVideoPath].forEach((file) => {
            if (fs.existsSync(file)) {
              fs.unlinkSync(file);
              console.log(`🗑 Deleted file: ${file}`);
            }
          });
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
