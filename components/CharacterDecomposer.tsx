
import React, { useState, useCallback } from 'react';
import FeatureCard from './FeatureCard';
import ImageUploader from './ImageUploader';
import { decomposeCharacter } from '../services/geminiService';
import type { ImageFile, HistoryItem } from '../types';
import { TrashIcon } from './icons/TrashIcon';

interface CharacterDecomposerProps {
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp' | 'tabId' | 'tabLabel'>) => void;
}

const CharacterDecomposer: React.FC<CharacterDecomposerProps> = ({ addToHistory }) => {
  const [image, setImage] = useState<ImageFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!image) {
      setError('Please upload an image first.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Expecting array of 4 strings now
      const results = await decomposeCharacter(image.file);
      
      addToHistory({
        resultImage: results[0], // Use first image as main thumbnail
        resultImages: results,   // Store all layers
        inputs: {
          sourceImage: image.previewUrl,
        }
      });
    } catch (err) {
      if (err instanceof Error && (err.message.includes('429') || err.message.toUpperCase().includes('RESOURCE_EXHAUSTED'))) {
        setError('Rate limit exceeded. Please wait a minute and try again.');
        setIsRateLimited(true);
        setTimeout(() => setIsRateLimited(false), 60000);
      } else {
        setError('Failed to decompose character. Please try again.');
        console.error(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [image, addToHistory]);
  
  const handleClear = useCallback(() => {
    setImage(null);
    setIsLoading(false);
    setError(null);
  }, []);

  return (
    <FeatureCard>
      <div>
        <h2 className="text-xl font-semibold mb-1 text-white">4-Layer Character Decomposer</h2>
        <p className="text-gray-400 mb-4 text-sm">Separates character into 4 texture maps: Full Body Mesh (T-Pose), Head (Hair/Beard), Clothing, and Accessories. Strictly non-destructive.</p>
        <ImageUploader image={image} onFileSelect={setImage} label="Source Character" />
        {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        
        <div className="mt-4 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
            <h3 className="text-sm font-bold text-gray-300 mb-2">Quad-Layer Output</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-400">
                <div className="bg-gray-800 p-2 rounded text-center border border-gray-600">
                    <span className="block mb-1 text-purple-400 font-bold">1. Full Body (T-Pose)</span>
                    Shape Preserved
                </div>
                <div className="bg-gray-800 p-2 rounded text-center border border-gray-600">
                    <span className="block mb-1 text-blue-400 font-bold">2. Head</span>
                    Hair & Beard
                </div>
                <div className="bg-gray-800 p-2 rounded text-center border border-gray-600">
                    <span className="block mb-1 text-green-400 font-bold">3. Clothes</span>
                    Garments
                </div>
                <div className="bg-gray-800 p-2 rounded text-center border border-gray-600">
                    <span className="block mb-1 text-yellow-400 font-bold">4. Acc</span>
                    Props/Jewelry
                </div>
            </div>
            <p className="text-[10px] text-gray-500 mt-2 italic text-center">
               * Retains original body weight, height, and proportions.
            </p>
        </div>

        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={handleGenerate}
            disabled={!image || isLoading || isRateLimited}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:bg-gray-500 disabled:from-gray-500 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center shadow-lg shadow-purple-900/20"
          >
            {isRateLimited ? (
              'Rate Limited (Wait 1m)'
            ) : isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Extracting 4 Layers...
              </>
            ) : (
              'Decompose Character'
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

export default CharacterDecomposer;
