#!/bin/bash

# Set up local bin directory
mkdir -p ./bin
export PATH="./bin:$PATH"

# Download yt-dlp (save inside project folder)
echo "Downloading yt-dlp..."
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ./bin/yt-dlp
chmod +x ./bin/yt-dlp

# Download ffmpeg (save inside project folder)
echo "Downloading FFmpeg..."
curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -o ffmpeg.tar.xz
tar -xJf ffmpeg.tar.xz
mv ffmpeg-*-static/ffmpeg ./bin/ffmpeg
mv ffmpeg-*-static/ffprobe ./bin/ffprobe
chmod +x ./bin/ffmpeg ./bin/ffprobe

# Cleanup
rm -rf ffmpeg-*-static ffmpeg.tar.xz

echo "Installation complete. yt-dlp and ffmpeg are ready to use."
