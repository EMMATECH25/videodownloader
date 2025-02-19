#!/bin/bash

# Set up local bin directory
INSTALL_DIR="/opt/render/project/src/bin"
mkdir -p "$INSTALL_DIR"

# Set permissions
chmod 755 "$INSTALL_DIR"

# Download yt-dlp (save inside bin)
echo "Downloading yt-dlp..."
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o "$INSTALL_DIR/yt-dlp"
chmod +x "$INSTALL_DIR/yt-dlp"
ls -l "$INSTALL_DIR/yt-dlp"

# Download ffmpeg (save inside bin)
echo "Downloading FFmpeg..."
curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -o ffmpeg.tar.xz
tar -xJf ffmpeg.tar.xz
mv ffmpeg-*-static/ffmpeg "$INSTALL_DIR/ffmpeg"
mv ffmpeg-*-static/ffprobe "$INSTALL_DIR/ffprobe"
chmod +x "$INSTALL_DIR/ffmpeg" "$INSTALL_DIR/ffprobe"

# Cleanup
rm -rf ffmpeg-*-static ffmpeg.tar.xz

# Confirm installation
echo "Installation complete. yt-dlp and ffmpeg are ready to use."
ls -l "$INSTALL_DIR" > /opt/render/project/src/bin/install_log.txt
