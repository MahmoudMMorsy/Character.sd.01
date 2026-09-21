import React, { useRef, useState } from 'react';
import type { VideoFile } from '../types';
import { CopyIcon } from './icons/CopyIcon';
import { PasteIcon } from './icons/PasteIcon';

interface VideoUploaderProps {
  onFileSelect: (videoFile: VideoFile | null) => void;
  video: VideoFile | null;
  label: string;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ onFileSelect, video, label }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);

  const handleFileSelected = (file: File | null) => {
    if (file && file.type.startsWith("video/")) {
      onFileSelect({
        file,
        previewUrl: URL.createObjectURL(file),
      });
      setPasteError(null);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelected(event.target.files?.[0] ?? null);
    if (event.target) {
        event.target.value = "";
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelected(e.dataTransfer.files?.[0] ?? null);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('video/')) {
        const file = items[i].getAsFile();
        if (file) {
          handleFileSelected(file);
        }
        break;
      }
    }
  };
  
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!video) return;
    try {
        const response = await fetch(video.previewUrl);
        const blob = await response.blob();
        await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob })
        ]);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
        console.error('Failed to copy video:', err);
    }
  };

  const handlePasteButtonClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setPasteError(null);
    try {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
            const videoType = item.types.find(type => type.startsWith('video/'));
            if (videoType) {
                const blob = await item.getType(videoType);
                const file = new File([blob], `pasted-video.${videoType.split('/')[1]}`, { type: videoType });
                handleFileSelected(file);
                return;
            }
        }
        setPasteError('No video found on clipboard.');
    } catch (err) {
        console.error('Failed to read from clipboard:', err);
        setPasteError('Could not paste video. Please check permissions.');
    }
    setTimeout(() => setPasteError(null), 3000);
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <div 
        className={`w-full h-64 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors duration-300 relative ${isDragging ? 'border-purple-500 bg-gray-700' : 'border-gray-600 bg-gray-800 hover:border-purple-500'} focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
        tabIndex={0}
        aria-label={`${label}. Click, drag & drop, or paste a video.`}
      >
        {video ? (
          <>
            <video src={video.previewUrl} autoPlay loop muted playsInline className="max-h-full max-w-full object-contain rounded-md" />
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500"
              aria-label="Remove video"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              onClick={handleCopy}
              className="absolute top-2 left-2 bg-blue-600 text-white rounded-full p-1.5 hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
              aria-label="Copy video"
            >
              {copySuccess ? 
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> :
                <CopyIcon className="h-4 w-4" />
              }
            </button>
          </>
        ) : (
          <div className="text-center">
            <button
                onClick={handlePasteButtonClick}
                className="absolute top-2 left-2 bg-green-600 text-white rounded-full p-1.5 hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500"
                aria-label="Paste video from clipboard"
              >
                <PasteIcon className="h-4 w-4" />
            </button>
            {pasteError && <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-red-400 bg-gray-900/80 px-2 py-1 rounded">{pasteError}</p>}
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={handleFileChange}
              className="sr-only"
              ref={fileInputRef}
            />
            <button onClick={() => fileInputRef.current?.click()} className="text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="mt-2 text-sm">{isDragging ? 'Drop video to upload' : 'Click, drag & drop, or paste'}</p>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUploader;
