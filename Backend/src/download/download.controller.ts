import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ytdlp from 'yt-dlp-exec'; // ✅ Fixed Import

const COOKIES_PATH = path.join(__dirname, '..', '..', 'cookies.txt');
const FFMPEG_PATH = path.join(__dirname, '..', '..', 'bin', 'ffmpeg.exe');

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

    const tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'temp_'));
    console.log(`📂 Temporary Directory Created: ${tmpDir}`);

    const timestamp = Date.now();
    const originalVideoPath = path.join(tmpDir, `video_${timestamp}.mp4`);
    const processedVideoPath = path.join(tmpDir, `processed_${timestamp}.mp4`);

    console.log(
      `📄 Filenames: \n - Original: ${originalVideoPath}\n - Processed: ${processedVideoPath}`,
    );

    try {
      console.log(`🖥 Executing yt-dlp-exec...`);

      const ytDlpArgs = {
        output: originalVideoPath,
        format: 'bv*+ba/b',
        mergeOutputFormat: 'mp4',
        hlsPreferFfmpeg: true,
      };

      if (fs.existsSync(COOKIES_PATH)) {
        console.log('🔐 Using cookies:', COOKIES_PATH);
        ytDlpArgs['cookies'] = COOKIES_PATH;
      }

      await ytdlp.exec(url, ytDlpArgs); // ✅ Fixed yt-dlp-exec call

      console.log(`✅ yt-dlp Download Completed!`);

      if (!fs.existsSync(originalVideoPath)) {
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
        finalVideoPath = path.join(tmpDir, `trimmed_${timestamp}.mp4`);
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
      res.download(finalVideoPath, `downloaded_${timestamp}.mp4`, (err) => {
        if (err) {
          console.error('❌ File download error:', err);
        } else {
          console.log(`✅ File successfully sent to user: ${finalVideoPath}`);
        }

        // Cleanup files after sending
        this.cleanupFiles([finalVideoPath, originalVideoPath, tmpDir]);
      });
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

  private cleanupFiles(files: string[]) {
    files.forEach((filePath) => {
      fs.rm(filePath, { recursive: true, force: true }, (err) => {
        if (err) console.error(`❌ Error deleting ${filePath}:`, err);
        else console.log(`🗑 Deleted: ${filePath}`);
      });
    });
  }
}
