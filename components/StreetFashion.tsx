
import React, { useState, useCallback } from 'react';
import FeatureCard from './FeatureCard';
import ImageUploader from './ImageUploader';
import { generateStreetFashion } from '../services/geminiService';
import type { ImageFile, HistoryItem } from '../types';
import { TrashIcon } from './icons/TrashIcon';

interface StreetFashionProps {
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp' | 'tabId' | 'tabLabel'>) => void;
}

const StreetFashion: React.FC<StreetFashionProps> = ({ addToHistory }) => {
  const [modelImage, setModelImage] = useState<ImageFile | null>(null);
  const [outfitImage, setOutfitImage] = useState<ImageFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!modelImage || !outfitImage) {
      setError('Please upload both the Model (Fig 1) and Outfit (Fig 2) images.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateStreetFashion(modelImage.file, outfitImage.file);
      addToHistory({
        resultImage: result,
        inputs: {
          modelImage: modelImage.previewUrl,
          outfitImage: outfitImage.previewUrl,
        }
      });
    } catch (err) {
      if (err instanceof Error && (err.message.includes('429') || err.message.toUpperCase().includes('RESOURCE_EXHAUSTED'))) {
        setError('Rate limit exceeded. Please wait a minute and try again.');
        setIsRateLimited(true);
        setTimeout(() => setIsRateLimited(false), 60000);
      } else {
        setError('Failed to generate street fashion photo. Please try again.');
        console.error(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [modelImage, outfitImage, addToHistory]);
  
  const handleClear = useCallback(() => {
    setModelImage(null);
    setOutfitImage(null);
    setIsLoading(false);
    setError(null);
  }, []);

  return (
    <FeatureCard>
      <div>
        <h2 className="text-xl font-semibold mb-1 text-white">Street Fashion Photoshoot</h2>
        <p className="text-gray-400 mb-4 text-sm">
            Select people in <strong>Figure 1</strong> and dress them in the outfit from <strong>Figure 2</strong>. 
            Generates a realistic outdoor photo with natural lighting and modern street style.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <ImageUploader image={modelImage} onFileSelect={setModelImage} label="Figure 1: The Person (Identity & Pose)" />
             <ImageUploader image={outfitImage} onFileSelect={setOutfitImage} label="Figure 2: The Outfit (Clothes & Accessories)" />
        </div>

        {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        
        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={handleGenerate}
            disabled={!modelImage || !outfitImage || isLoading || isRateLimited}
            className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:from-indigo-600 hover:to-blue-600 disabled:bg-gray-500 disabled:from-gray-500 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center shadow-lg shadow-indigo-900/20"
          >
            {isRateLimited ? (
              'Rate Limited (Wait 1m)'
            ) : isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Capturing Scene...
              </>
            ) : (
              'Generate Fashion Shoot'
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

export default StreetFashion;
