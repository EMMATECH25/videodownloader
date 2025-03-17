var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
function App() {
    const [videoUrl, setVideoUrl] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);
    const timeToSeconds = (time) => {
        const parts = time.split(':').map(Number);
        if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        }
        return parseInt(time, 10) || 0;
    };
    const handleDownload = () => __awaiter(this, void 0, void 0, function* () {
        if (!videoUrl) {
            setErrorMessage('Please input the full video URL before downloading.');
            return;
        }
        setErrorMessage('');
        setStatusMessage('Download in Progress...');
        setIsDownloading(true);
        let downloadUrl = `https://videodownloader-d963.onrender.com/api/download?url=${encodeURIComponent(videoUrl)}&t=${Date.now()}`;
        if (startTime)
            downloadUrl += `&start=${timeToSeconds(startTime)}`;
        if (endTime)
            downloadUrl += `&end=${timeToSeconds(endTime)}`;
        try {
            const response = yield fetch(downloadUrl);
            if (!response.ok) {
                throw new Error('Download failed. Please try again.');
            }
            // Create an invisible link to trigger download
            const blob = yield response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `downloaded_video.mp4`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setStatusMessage('Download Complete. Sending video to your system.');
        }
        catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred.');
            setStatusMessage('');
        }
        finally {
            setIsDownloading(false);
        }
    });
    return (_jsxs("div", { className: "flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6", children: [_jsx("h1", { className: "text-3xl font-bold mb-4 text-blue-600", children: "Video Downloader" }), _jsx("input", { type: "text", placeholder: "Enter video URL", className: "border rounded-lg p-2 w-full max-w-md mb-3", value: videoUrl, onChange: (e) => setVideoUrl(e.target.value) }), _jsxs("div", { className: "w-full max-w-md flex flex-col gap-3 mb-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700", children: "Start Time (mm:ss)" }), _jsx("input", { type: "text", placeholder: "e.g., 0:30", className: "border rounded-lg p-2 w-full", value: startTime, onChange: (e) => setStartTime(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700", children: "End Time (mm:ss)" }), _jsx("input", { type: "text", placeholder: "e.g., 1:26", className: "border rounded-lg p-2 w-full", value: endTime, onChange: (e) => setEndTime(e.target.value) })] })] }), _jsx("button", { onClick: handleDownload, className: "bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition w-full max-w-md", disabled: isDownloading, children: isDownloading ? 'Downloading...' : 'Download' }), statusMessage && _jsx("p", { className: "text-green-600 mt-2", children: statusMessage }), errorMessage && _jsx("p", { className: "text-red-500 mt-2", children: errorMessage }), _jsxs("div", { className: "mt-6 p-4 bg-white shadow-lg rounded-lg w-full max-w-md", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-700", children: "How to Download" }), _jsx("p", { className: "text-gray-600 mt-2", children: "\uD83D\uDD39 To download the full video, simply paste the URL and click \"Download.\"" }), _jsxs("p", { className: "text-gray-600 mt-2", children: ["\uD83D\uDD39 To download a specific section, enter the start and end times in ", _jsx("strong", { children: "mm:ss" }), " format."] })] })] }));
}
export default App;
