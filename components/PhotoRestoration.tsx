
import React, { useState, useCallback } from 'react';
import FeatureCard from './FeatureCard';
import ImageUploader from './ImageUploader';
import { restorePhoto } from '../services/geminiService';
import type { ImageFile, HistoryItem } from '../types';
import { TrashIcon } from './icons/TrashIcon';

interface PhotoRestorationProps {
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp' | 'tabId' | 'tabLabel'>) => void;
}

const PhotoRestoration: React.FC<PhotoRestorationProps> = ({ addToHistory }) => {
  const [image, setImage] = useState<ImageFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [withColorization, setWithColorization] = useState(true);

  const handleGenerate = useCallback(async () => {
    if (!image) {
      setError('Please upload an image.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await restorePhoto(image.file, withColorization);
      addToHistory({
        resultImage: result,
        inputs: {
          sourceImage: image.previewUrl,
          withColorization: withColorization
        }
      });
    } catch (err) {
      if (err instanceof Error && (err.message.includes('429') || err.message.toUpperCase().includes('RESOURCE_EXHAUSTED'))) {
        setError('Rate limit exceeded. Please wait a minute and try again.');
        setIsRateLimited(true);
        setTimeout(() => setIsRateLimited(false), 60000);
      } else {
        setError('Failed to restore photo. Please try again.');
        console.error(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [image, withColorization, addToHistory]);
  
  const handleClear = useCallback(() => {
    setImage(null);
    setIsLoading(false);
    setError(null);
  }, []);

  return (
    <FeatureCard>
      <div>
        <h2 className="text-xl font-semibold mb-1 text-white">Old Photo Restoration</h2>
        <p className="text-gray-400 mb-4 text-sm">
            Fix scratches, sharpen blur, and colorize black & white photos.
        </p>
        <ImageUploader image={image} onFileSelect={setImage} label="Old / Damaged Photo" />
        
        <div className="mt-4 flex items-center bg-gray-900/50 p-3 rounded-lg border border-gray-700">
            <input 
                type="checkbox" 
                id="colorize-check"
                checked={withColorization}
                onChange={(e) => setWithColorization(e.target.checked)}
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 bg-gray-700 border-gray-600"
            />
            <label htmlFor="colorize-check" className="ml-3 text-sm font-medium text-gray-300 cursor-pointer select-none">
                Apply Colorization <span className="text-gray-500 text-xs ml-1">(B&W to Color)</span>
            </label>
        </div>

        {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        
        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={handleGenerate}
            disabled={!image || isLoading || isRateLimited}
            className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold py-3 px-4 rounded-lg hover:from-amber-700 hover:to-orange-700 disabled:bg-gray-500 disabled:from-gray-500 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center shadow-lg shadow-amber-900/20"
          >
            {isRateLimited ? (
              'Rate Limited (Wait 1m)'
            ) : isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Restoring Memories...
              </>
            ) : (
              'Restore & Colorize'
            )}
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

export default PhotoRestoration;
