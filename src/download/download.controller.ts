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
      const response = await axios.get(shortUrl, {
        maxRedirects: 5, // Allow more redirects
        validateStatus: (status) => status >= 200 && status < 400,
      });
      const request = response.request as { res: { responseUrl: string } };
      if (request.res.responseUrl) {
        console.log('Expanded URL:', request.res.responseUrl);
        return request.res.responseUrl;
      }
    } catch (error) {
      console.warn(
        'Failed to expand URL:',
        axios.isAxiosError(error) ? error.response?.status : error,
      );
    }
    return shortUrl; // Fallback to original URL
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
      // Expand Facebook shortened links
      if (url.includes('fb.watch')) {
        console.log('Expanding Facebook URL:', url);
        url = await this.expandFacebookUrl(url);
      }

      const outputPath = path.join(__dirname, '..', '..', 'downloads');
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
      }

      const originalVideoPath = path.join(outputPath, 'original_video.mp4');
      const processedVideoPath = path.join(outputPath, 'processed_video.mp4');

      console.log('Downloading video...');
      let ytDlpCommand = `${YT_DLP_PATH} -o "${originalVideoPath}" -f "bv*+ba/b" --merge-output-format mp4 --no-mtime --hls-prefer-ffmpeg "${url}"`;

      if (fs.existsSync(COOKIES_PATH)) {
        console.log('Using cookies file for authentication:', COOKIES_PATH);
        ytDlpCommand = `${YT_DLP_PATH} --cookies "${COOKIES_PATH}" -o "${originalVideoPath}" -f bestvideo+bestaudio/best --merge-output-format mp4 "${url}"`;
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

      console.log('Download complete, ensuring correct format...');

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
      if (start !== undefined || end !== undefined) {
        const startTime = parseFloat(start || '0'); // Default to 0 if not provided
        const endTime = parseFloat(end || '0');

        if (!isNaN(startTime) && !isNaN(endTime) && endTime > startTime) {
          console.log(`Trimming video from ${startTime} to ${endTime}`);
          ffmpegCommand = ffmpegCommand
            .setStartTime(startTime)
            .setDuration(endTime - startTime);
          isTrimming = true;
        } else if (!isNaN(startTime) && isNaN(endTime)) {
          console.log(`Trimming video from ${startTime} until the end`);
          ffmpegCommand = ffmpegCommand.setStartTime(startTime);
          isTrimming = true;
        } else if (!isNaN(endTime) && isNaN(startTime)) {
          console.log(`Trimming video from beginning to ${endTime}`);
          ffmpegCommand = ffmpegCommand.setDuration(endTime);
          isTrimming = true;
        } else {
          console.error('Invalid start or end time provided.');
          return res.status(400).json({ error: 'Invalid start or end time.' });
        }
      }

      const finalVideoPath = isTrimming
        ? path.join(outputPath, 'trimmed_video.mp4')
        : processedVideoPath;

      await new Promise<void>((resolve, reject) => {
        ffmpegCommand
          .output(finalVideoPath)
          .on('start', (cmd) => console.log('FFmpeg command:', cmd))
          .on('progress', (progress) => console.log('Progress:', progress))
          .on('end', () => {
            console.log('Processing complete.');
            resolve();
          })
          .on('error', (err: Error) => {
            console.error('Processing error:', err.message);
            reject(err);
          })
          .run();
      });

      console.log('Sending processed video...');
      res.download(finalVideoPath, 'downloaded_video.mp4', (err) => {
        if (err) {
          console.error('Download error:', err);
          return res.status(500).json({ error: 'Error downloading the video' });
        }

        setTimeout(() => {
          try {
            if (fs.existsSync(originalVideoPath))
              fs.unlinkSync(originalVideoPath);
            if (fs.existsSync(finalVideoPath)) fs.unlinkSync(finalVideoPath);
          } catch (cleanupError) {
            console.error('Error during file cleanup:', cleanupError);
          }
        }, 5000);
      });
    } catch (error: unknown) {
      console.error('Error:', error instanceof Error ? error.message : error);
      return res
        .status(500)
        .json({ error: 'Failed to download and process video' });
    }
  }
}
