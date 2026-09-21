
import React, { useState, useCallback } from 'react';
import FeatureCard from './FeatureCard';
import ImageUploader from './ImageUploader';
import { swapFaces } from '../services/geminiService';
import type { ImageFile, HistoryItem } from '../types';
import { TrashIcon } from './icons/TrashIcon';

interface FaceSwapProps {
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp' | 'tabId' | 'tabLabel'>) => void;
}

const FaceSwap: React.FC<FaceSwapProps> = ({ addToHistory }) => {
  const [sourceImage, setSourceImage] = useState<ImageFile | null>(null);
  const [faceImage, setFaceImage] = useState<ImageFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!sourceImage || !faceImage) {
      setError('Please upload both a source and a face image.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await swapFaces(sourceImage.file, faceImage.file);
      addToHistory({
        resultImage: result,
        inputs: {
          sourceImage: sourceImage.previewUrl,
          faceImage: faceImage.previewUrl,
        }
      });
    } catch (err) {
      if (err instanceof Error && (err.message.includes('429') || err.message.toUpperCase().includes('RESOURCE_EXHAUSTED'))) {
        setError('Rate limit exceeded. Please wait a minute and try again.');
        setIsRateLimited(true);
        setTimeout(() => setIsRateLimited(false), 60000);
      } else {
        setError('Failed to process images. Please try again.');
        console.error(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [sourceImage, faceImage, addToHistory]);
  
  const handleClear = useCallback(() => {
    setSourceImage(null);
    setFaceImage(null);
    setIsLoading(false);
    setError(null);
  }, []);

  return (
    <FeatureCard>
      <div>
        <h2 className="text-xl font-semibold mb-1 text-white">Upload Images</h2>
        <p className="text-gray-400 mb-4 text-sm">Provide a source image and a face image. The result appears in the History panel.</p>
        <div className="space-y-6">
          <ImageUploader image={sourceImage} onFileSelect={setSourceImage} label="Source Image (with original face)" />
          <ImageUploader image={faceImage} onFileSelect={setFaceImage} label="Face Image (to swap in)" />
        </div>
        {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={handleGenerate}
            disabled={!sourceImage || !faceImage || isLoading || isRateLimited}
            className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-300 flex items-center justify-center"
          >
            {isRateLimited ? 'Rate Limited (Wait 1m)' : isLoading ? 'Swapping...' : 'Swap Faces'}
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

export default FaceSwap;
