import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as ffmpeg from 'fluent-ffmpeg';
import axios from 'axios';

// Define absolute paths for binaries
const BIN_PATH = path.join(__dirname, '..', '..', 'bin');
const YT_DLP_PATH = path.join(BIN_PATH, 'yt-dlp');
const FFMPEG_PATH = path.join(BIN_PATH, 'ffmpeg');
const FFPROBE_PATH = path.join(BIN_PATH, 'ffprobe');
const COOKIES_PATH = path.join(__dirname, '..', '..', 'cookies.txt');

ffmpeg.setFfmpegPath(FFMPEG_PATH);
ffmpeg.setFfprobePath(FFPROBE_PATH);

@Controller('download')
export class DownloadController {
  // Function to resolve shortened Facebook URLs
  async expandFacebookUrl(shortUrl: string): Promise<string> {
    try {
      console.log('🔍 Expanding Facebook URL:', shortUrl);

      const response = await axios.get(shortUrl, {
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', // Avoid bot detection
        },
      });

      console.log('🛠 Response Status:', response.status);
      console.log('📝 Headers:', response.headers);

      let expandedUrl: string | undefined = response.headers.location as
        | string
        | undefined;

      if (!expandedUrl) {
        const request = response.request as { res?: { responseUrl?: string } };
        expandedUrl = request.res?.responseUrl;
      }

      if (!expandedUrl) {
        console.warn('⚠️ No valid expanded URL found.');
        return shortUrl;
      }

      console.log('✅ Expanded Facebook URL:', expandedUrl);
      return expandedUrl;
    } catch (error: unknown) {
      console.warn('❌ URL Expansion Failed:', error);
      return shortUrl;
    }
  }

  @Get()
  async downloadVideo(
    @Query('url') url: string,
    @Res() res: Response,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    if (!url) {
      return res.status(400).json({ error: 'Please provide a video URL!' });
    }

    try {
      if (url.includes('fb.watch')) {
        url = await this.expandFacebookUrl(url);
      }

      const outputPath = path.join(__dirname, '..', '..', 'downloads');
      if (!fs.existsSync(outputPath))
        fs.mkdirSync(outputPath, { recursive: true });

      const originalVideoPath = path.join(outputPath, 'original_video.mp4');
      const processedVideoPath = path.join(outputPath, 'processed_video.mp4');

      let ytDlpCommand = `${YT_DLP_PATH} --no-check-certificate --cookies "${COOKIES_PATH}" -o "${originalVideoPath}" -f "bestvideo+bestaudio/best" --merge-output-format mp4 --add-header "User-Agent: Mozilla/5.0" --verbose "${url}"`;

      if (fs.existsSync(COOKIES_PATH)) {
        ytDlpCommand = `${YT_DLP_PATH} --cookies "${COOKIES_PATH}" -o "${originalVideoPath}" -f bestvideo+bestaudio/best --merge-output-format mp4 "${url}"`;
      }

      console.log('Executing command:', ytDlpCommand);
      await new Promise<void>((resolve, reject) => {
        exec(ytDlpCommand, (error, stdout, stderr) => {
          if (error) return reject(error);
          console.log(stdout || stderr);
          resolve();
        });
      });

      if (!fs.existsSync(originalVideoPath)) {
        throw new Error('Download failed: File was not created.');
      }

      let ffmpegCommand = ffmpeg(originalVideoPath).outputOptions([
        '-y',
        '-c:v libx264',
        '-preset ultrafast',
        '-crf 30',
        '-c:a aac',
        '-b:a 128k',
        '-movflags +faststart',
      ]);
      let isTrimming = false;

      if (start || end) {
        const startTime = parseFloat(start || '0');
        const endTime = parseFloat(end || '0');

        if (!isNaN(startTime) && !isNaN(endTime) && endTime > startTime) {
          ffmpegCommand = ffmpegCommand
            .setStartTime(startTime)
            .setDuration(endTime - startTime);
          isTrimming = true;
        } else if (!isNaN(startTime) && isNaN(endTime)) {
          ffmpegCommand = ffmpegCommand.setStartTime(startTime);
          isTrimming = true;
        } else if (!isNaN(endTime) && isNaN(startTime)) {
          ffmpegCommand = ffmpegCommand.setDuration(endTime);
          isTrimming = true;
        } else {
          return res.status(400).json({ error: 'Invalid start or end time.' });
        }
      }

      const finalVideoPath = isTrimming
        ? path.join(outputPath, 'trimmed_video.mp4')
        : processedVideoPath;
      await new Promise<void>((resolve, reject) => {
        ffmpegCommand
          .output(finalVideoPath)
          .on('end', () => resolve())
          .on('error', reject)
          .run();
      });

      res.download(finalVideoPath, 'downloaded_video.mp4', (err) => {
        if (err)
          return res.status(500).json({ error: 'Error downloading the video' });
        setTimeout(() => {
          [originalVideoPath, finalVideoPath].forEach((file) => {
            if (fs.existsSync(file)) fs.unlinkSync(file);
          });
        }, 5000);
      });
    } catch (error) {
      console.error('Error:', error);
      return res
        .status(500)
        .json({ error: 'Failed to download and process video' });
    }
  }
}
