import React, { useState, useEffect } from 'react';
import ReactGA from "react-ga4";

// Initialize Google Analytics
const GA_MEASUREMENT_ID = "G-J84LVWRTMK"; // Replace with your actual GA ID
ReactGA.initialize(GA_MEASUREMENT_ID);

function App() {
  const [videoUrl, setVideoUrl] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    ReactGA.send({ hitType: "pageview", page: window.location.pathname });
  }, []);

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

    // Track download event
    ReactGA.event({ category: "User Actions", action: "Download Started", label: "Download Button Clicked" });

    let downloadUrl = `https://videodownloader-d963.onrender.com/api/download?url=${encodeURIComponent(videoUrl)}&t=${Date.now()}`;

    if (startTime) downloadUrl += `&start=${timeToSeconds(startTime)}`;
    if (endTime) downloadUrl += `&end=${timeToSeconds(endTime)}`;

    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('Download failed. Please try again.');
      }
      
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `downloaded_video.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setStatusMessage('Download Complete. Sending video to your system.');
      
      // Track successful download
      ReactGA.event({ category: "User Actions", action: "Download Completed", label: "Video Successfully Downloaded" });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred.');
      setStatusMessage('');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-4 text-blue-600">Facebook Video Downloader</h1>
      
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

      <div className="mt-6 p-4 bg-white shadow-lg rounded-lg w-full max-w-md">
        <h2 className="text-lg font-semibold text-gray-700">How to Download</h2>
        <p className="text-gray-600 mt-2">🔹 To download the full video, simply paste the URL and click "Download."</p>
        <p className="text-gray-600 mt-2">🔹 To download a specific section, enter the start and end times in <strong>mm:ss</strong> format.</p>
      </div>
      
    </div>
  );
}

export default App;
