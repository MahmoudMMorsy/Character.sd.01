
import React, { useState, useCallback } from 'react';
import FeatureCard from './FeatureCard';
import ImageUploader from './ImageUploader';
import VideoUploader from './VideoUploader';
import { bananaAnimate } from '../services/geminiService';
import type { ImageFile, VideoFile, HistoryItem } from '../types';
import { TrashIcon } from './icons/TrashIcon';

const extractFramesFromVideo = (
  videoFile: File,
  fps = 8,
  maxFrames = 24
): Promise<File[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const frames: File[] = [];
      const interval = 1 / fps;
      let currentTime = 0;
      let frameCount = 0;

      const seekAndCapture = () => {
        if (currentTime > video.duration || frameCount >= maxFrames) {
          URL.revokeObjectURL(video.src);
          resolve(frames);
          return;
        }
        video.currentTime = currentTime;
      };

      video.onseeked = () => {
        if (!ctx) {
          URL.revokeObjectURL(video.src);
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            frames.push(new File([blob], `frame-${frameCount}.png`, { type: 'image/png' }));
          }
          currentTime += interval;
          frameCount++;
          seekAndCapture();
        }, 'image/png');
      };

      video.onerror = (e) => {
          URL.revokeObjectURL(video.src);
          reject(e);
      };

      seekAndCapture();
    };

    video.onerror = (e) => {
      URL.revokeObjectURL(video.src);
      reject(e);
    };

    video.src = URL.createObjectURL(videoFile);
  });
};

interface BananaAnimatedProps {
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp' | 'tabId' | 'tabLabel'>) => void;
}

const BananaAnimated: React.FC<BananaAnimatedProps> = ({ addToHistory }) => {
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [imageFile, setImageFile] = useState<ImageFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!videoFile || !imageFile) {
      setError('Please upload both a source video and an image.');
      return;
    }
    setIsLoading(true);
    setLoadingMessage('');
    setError(null);
    try {
      setLoadingMessage('Extracting frames from video...');
      const frames = await extractFramesFromVideo(videoFile.file, 8, 24);

      if (frames.length === 0) {
        setError('Could not extract frames from the provided video. It might be empty or corrupted.');
        setIsLoading(false);
        return;
      }

      setLoadingMessage('Generating animation (this may take a minute)...');
      const result = await bananaAnimate(frames, imageFile.file);
      addToHistory({
        resultImage: result,
        inputs: {
          videoFile: videoFile.previewUrl,
          imageFile: imageFile.previewUrl,
        }
      });
    } catch (err) {
      if (err instanceof Error && (err.message.includes('429') || err.message.toUpperCase().includes('RESOURCE_EXHAUSTED'))) {
        setError('Rate limit exceeded. Please wait a minute and try again.');
        setIsRateLimited(true);
        setTimeout(() => setIsRateLimited(false), 60000);
      } else {
        setError('Failed to generate animation. Please try again.');
        console.error(err);
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [videoFile, imageFile, addToHistory]);
  
  const handleClear = useCallback(() => {
    setVideoFile(null);
    setImageFile(null);
    setIsLoading(false);
    setError(null);
  }, []);

  return (
    <FeatureCard>
      <div>
        <h2 className="text-xl font-semibold mb-1 text-white">Upload Media</h2>
        <p className="text-gray-400 mb-4 text-sm">Provide a video for motion and an image to animate. The result will appear in the History panel.</p>
        <div className="space-y-6">
          <VideoUploader video={videoFile} onFileSelect={setVideoFile} label="Source Video (for motion)" />
          <ImageUploader image={imageFile} onFileSelect={setImageFile} label="Source Image (to animate)" />
        </div>
        {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        {isLoading && loadingMessage && <p className="text-purple-400 mt-4 text-center">{loadingMessage}</p>}
        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={handleGenerate}
            disabled={!videoFile || !imageFile || isLoading || isRateLimited}
            className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-300 flex items-center justify-center"
          >
            {isRateLimited ? 'Rate Limited (Wait 1m)' : isLoading ? 'Animating...' : 'Generate Animation'}
          </button>
          <button
              onClick={handleClear}
              className="p-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors"
              aria-label="Clear inputs"
              disabled={isLoading || isRateLimited}
            >
              <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </FeatureCard>
  );
};

export default BananaAnimated;
