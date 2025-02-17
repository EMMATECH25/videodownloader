#!/bin/bash
echo "Installing FFmpeg..."
apt-get update && apt-get install -y ffmpeg
echo "FFmpeg installation complete."

#!/bin/bash
# Install FFmpeg
apt-get update && apt-get install -y ffmpeg

# Install yt-dlp
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
chmod a+rx /usr/local/bin/yt-dlp