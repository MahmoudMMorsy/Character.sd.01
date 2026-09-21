
import React, { useState, useCallback } from 'react';
import FeatureCard from './FeatureCard';
import ImageUploader from './ImageUploader';
import { virtualTryOn } from '../services/geminiService';
import type { ImageFile, HistoryItem } from '../types';
import { TrashIcon } from './icons/TrashIcon';

interface VirtualTryOnProps {
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp' | 'tabId' | 'tabLabel'>) => void;
}

const VirtualTryOn: React.FC<VirtualTryOnProps> = ({ addToHistory }) => {
  const [characterImage, setCharacterImage] = useState<ImageFile | null>(null);
  const [clothesImage, setClothesImage] = useState<ImageFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!characterImage || !clothesImage) {
      setError('Please upload both a character and a clothes image.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await virtualTryOn(characterImage.file, clothesImage.file);
      addToHistory({
        resultImage: result,
        inputs: {
          characterImage: characterImage.previewUrl,
          clothesImage: clothesImage.previewUrl,
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
  }, [characterImage, clothesImage, addToHistory]);
  
  const handleClear = useCallback(() => {
    setCharacterImage(null);
    setClothesImage(null);
    setIsLoading(false);
    setError(null);
  }, []);

  return (
    <FeatureCard>
      <div>
        <h2 className="text-xl font-semibold mb-1 text-white">Upload Images</h2>
        <p className="text-gray-400 mb-4 text-sm">Provide a character and clothing image. The result will appear in the History panel.</p>
        <div className="space-y-6">
          <ImageUploader image={characterImage} onFileSelect={setCharacterImage} label="Character Image" />
          <ImageUploader image={clothesImage} onFileSelect={setClothesImage} label="Clothes Image" />
        </div>
        {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={handleGenerate}
            disabled={!characterImage || !clothesImage || isLoading || isRateLimited}
            className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-300 flex items-center justify-center"
          >
            {isRateLimited ? 'Rate Limited (Wait 1m)' : isLoading ? 'Dressing...' : 'Perform Virtual Try-On'}
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

export default VirtualTryOn;
