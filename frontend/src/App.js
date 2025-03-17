import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
function App() {
    const [videoUrl, setVideoUrl] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [showPopup, setShowPopup] = useState(false);
    const [downloadComplete, setDownloadComplete] = useState(false);
    // Convert mm:ss to total seconds
    const timeToSeconds = (time) => {
        const parts = time.split(':').map(Number);
        if (parts.length === 2) {
            return parts[0] * 60 + parts[1]; // Convert mm:ss to total seconds
        }
        return parseInt(time, 10) || 0; // Handle single number input
    };
    const handleDownload = () => {
        if (!videoUrl) {
            setErrorMessage('Please input the full video URL before downloading.');
            return;
        }
        setErrorMessage('');
        setShowPopup(true);
        setDownloadComplete(false);
        let downloadUrl = `https://videodownloader-d963.onrender.com/api/download?url=${encodeURIComponent(videoUrl)}&t=${Date.now()}`;
        if (startTime)
            downloadUrl += `&start=${timeToSeconds(startTime)}`;
        if (endTime)
            downloadUrl += `&end=${timeToSeconds(endTime)}`;
        setTimeout(() => {
            setShowPopup(false);
            setDownloadComplete(true);
            window.location.href = downloadUrl;
        }, 2000);
    };
    return (_jsxs("div", { className: "flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6", children: [_jsx("h1", { className: "text-3xl font-bold mb-4 text-blue-600", children: "Video Downloader" }), _jsx("input", { type: "text", placeholder: "Enter video URL", className: "border rounded-lg p-2 w-full max-w-md mb-3", value: videoUrl, onChange: (e) => setVideoUrl(e.target.value) }), _jsxs("div", { className: "w-full max-w-md flex flex-col gap-3 mb-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700", children: "Start Time (mm:ss)" }), _jsx("input", { type: "text", placeholder: "e.g., 0:30", className: "border rounded-lg p-2 w-full", value: startTime, onChange: (e) => setStartTime(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700", children: "End Time (mm:ss)" }), _jsx("input", { type: "text", placeholder: "e.g., 1:26", className: "border rounded-lg p-2 w-full", value: endTime, onChange: (e) => setEndTime(e.target.value) })] })] }), _jsx("button", { onClick: handleDownload, className: "bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition w-full max-w-md", children: "Download" }), errorMessage && _jsx("p", { className: "text-red-500 mt-2", children: errorMessage }), showPopup && _jsx("p", { className: "text-blue-500 mt-2", children: "\uD83D\uDD04 Downloading... Please wait." }), downloadComplete && _jsx("p", { className: "text-green-500 mt-2", children: "\u2705 Download Complete!" }), _jsxs("div", { className: "mt-6 p-4 bg-white shadow-lg rounded-lg w-full max-w-md", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-700", children: "How to Download" }), _jsx("p", { className: "text-gray-600 mt-2", children: "\uD83D\uDD39 To download the full video, simply paste the URL and click \"Download.\"" }), _jsxs("p", { className: "text-gray-600 mt-2", children: ["\uD83D\uDD39 To download a specific section, enter the start and end times in ", _jsx("strong", { children: "mm:ss" }), " format."] })] })] }));
}
export default App;
