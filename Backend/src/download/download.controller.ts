import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as ffmpeg from 'fluent-ffmpeg';

const BIN_PATH = path.join(__dirname, '..', '..', 'bin');
const YT_DLP_PATH = path.join(BIN_PATH, 'yt-dlp');
const FFMPEG_PATH = path.join(BIN_PATH, 'ffmpeg.exe');
const COOKIES_PATH = path.join(__dirname, '..', '..', 'cookies.txt');

ffmpeg.setFfmpegPath(FFMPEG_PATH);

// ✅ Changed route from /download to /api/download
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
      const tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'temp_'));
      console.log(`📂 Temporary Directory Created: ${tmpDir}`);

      const timestamp = Date.now();
      const originalVideoPath = path.join(tmpDir, `video_${timestamp}.mp4`);
      const processedVideoPath = path.join(
        tmpDir,
        `processed_${timestamp}.mp4`,
      );

      console.log(
        `📄 Filenames: \n - Original: ${originalVideoPath}\n - Processed: ${processedVideoPath}`,
      );

      let ytDlpCommand = `${YT_DLP_PATH} -o "${originalVideoPath}" -f "bv*+ba/b" --merge-output-format mp4 --no-mtime --hls-prefer-ffmpeg "${url}"`;

      if (fs.existsSync(COOKIES_PATH)) {
        console.log('🔐 Using cookies:', COOKIES_PATH);
        ytDlpCommand = `${YT_DLP_PATH} --cookies "${COOKIES_PATH}" -o "${originalVideoPath}" -f bestvideo+bestaudio/best --merge-output-format mp4 "${url}"`;
      }

      console.log(`🖥 Executing yt-dlp command:\n   ${ytDlpCommand}`);

      const downloadSuccess = await new Promise<boolean>((resolve) => {
        exec(ytDlpCommand, (error, stdout, stderr) => {
          console.log('📄 yt-dlp Output:\n', stdout);
          console.log('⚠ yt-dlp Errors:\n', stderr);

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

        fs.unlink(finalVideoPath, (err) => {
          if (err) console.error('❌ Error deleting processed file:', err);
          else console.log(`🗑 Deleted processed file: ${finalVideoPath}`);
        });

        fs.unlink(originalVideoPath, (err) => {
          if (err) console.error('❌ Error deleting original file:', err);
          else console.log(`🗑 Deleted original file: ${originalVideoPath}`);
        });

        fs.rmdir(tmpDir, { recursive: true }, (err) => {
          if (err) console.error('❌ Error deleting temp directory:', err);
          else console.log(`🗑 Deleted temp directory: ${tmpDir}`);
        });
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
}
