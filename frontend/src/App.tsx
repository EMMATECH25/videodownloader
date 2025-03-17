import React, { useState } from 'react';

function App() {
  const [videoUrl, setVideoUrl] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const timeToSeconds = (time: string) => {
    const parts = time.split(':').map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parseInt(time, 10) || 0;
  };

  const handleDownload = async () => {
    if (!videoUrl) {
      setErrorMessage('Please input the full video URL before downloading.');
      return;
    }
    setErrorMessage('');
    setStatusMessage('Download in Progress...');
    setIsDownloading(true);

    let downloadUrl = `https://videodownloader-d963.onrender.com/api/download?url=${encodeURIComponent(videoUrl)}&t=${Date.now()}`;

    if (startTime) downloadUrl += `&start=${timeToSeconds(startTime)}`;
    if (endTime) downloadUrl += `&end=${timeToSeconds(endTime)}`;

    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('Download failed. Please try again.');
      }
      
      // Create an invisible link to trigger download
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `downloaded_video.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setStatusMessage('Download Complete. Sending video to your system.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred.');
      setStatusMessage('');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-4 text-blue-600">Video Downloader</h1>
      
      <input
        type="text"
        placeholder="Enter video URL"
        className="border rounded-lg p-2 w-full max-w-md mb-3"
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
      />
      
      <div className="w-full max-w-md flex flex-col gap-3 mb-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Start Time (mm:ss)</label>
          <input
            type="text"
            placeholder="e.g., 0:30"
            className="border rounded-lg p-2 w-full"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">End Time (mm:ss)</label>
          <input
            type="text"
            placeholder="e.g., 1:26"
            className="border rounded-lg p-2 w-full"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      </div>
      
      <button
        onClick={handleDownload}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition w-full max-w-md"
        disabled={isDownloading}
      >
        {isDownloading ? 'Downloading...' : 'Download'}
      </button>

      {statusMessage && <p className="text-green-600 mt-2">{statusMessage}</p>}
      {errorMessage && <p className="text-red-500 mt-2">{errorMessage}</p>}
    </div>
  );
}

export default App;
