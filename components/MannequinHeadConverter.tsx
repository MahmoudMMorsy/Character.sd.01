import React, { useState, useCallback } from 'react';
import FeatureCard from './FeatureCard';
import ImageUploader from './ImageUploader';
import { convertToMannequinHead } from '../services/geminiService';
import type { ImageFile, HistoryItem } from '../types';
import { TrashIcon } from './icons/TrashIcon';

interface MannequinHeadConverterProps {
  addToHistory?: (item: any) => void;
}

const MannequinHeadConverter: React.FC<MannequinHeadConverterProps> = ({ addToHistory }) => {
  const [image, setImage] = useState<ImageFile | null>(null);
  const [preserveTexture, setPreserveTexture] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!image) {
      setError('Please upload an image.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await convertToMannequinHead(image, preserveTexture);
      if (addToHistory) {
        addToHistory({
          resultImage: result,
          inputs: {
            sourceImage: image.previewUrl,
          }
        });
      }
    } catch (err) {
      if (err instanceof Error && (err.message.includes('429') || err.message.toUpperCase().includes('RESOURCE_EXHAUSTED'))) {
        setError('Rate limit exceeded. Please wait a minute and try again.');
        setIsRateLimited(true);
        setTimeout(() => setIsRateLimited(false), 60000);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to generate mannequin head. Please try again.');
        console.error("Mannequin generation error:", err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [image, preserveTexture, addToHistory]);
  
  const handleClear = useCallback(() => {
    setImage(null);
    setIsLoading(false);
    setError(null);
  }, []);

  return (
    <FeatureCard>
      <div>
        <h2 className="text-xl font-semibold mb-1 text-white">Mannequin Head Converter</h2>
        <p className="text-gray-400 mb-4 text-sm leading-relaxed">
            Upload an image to convert the character's head into a hollow stylized mannequin bust with deep black void eyes, no hair, and no accessories.
        </p>
        
        <ImageUploader image={image} onFileSelect={setImage} label="Source Image" />
        
        <div className="mt-5 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          <label className="flex items-start cursor-pointer group">
            <div className="flex items-center h-5">
              <input
                type="checkbox"
                checked={preserveTexture}
                onChange={(e) => setPreserveTexture(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
              />
            </div>
            <div className="ml-3 text-sm">
              <span className="font-medium text-white group-hover:text-blue-300 transition-colors">
                Realism On: Preserve Skin Texture
              </span>
              <p className="text-gray-400 mt-1 text-xs">
                If checked, keeps realistic skin pores and natural shine. If unchecked (default), uses a smooth matte-plastic mannequin texture.
              </p>
            </div>
          </label>
        </div>

        {error && <p className="text-red-400 mt-4 text-center text-sm bg-red-900/30 p-2 rounded">{error}</p>}
        
        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={handleGenerate}
            disabled={!image || isLoading || isRateLimited}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold py-3 px-4 rounded-lg hover:from-orange-600 hover:to-amber-700 disabled:bg-gray-500 disabled:from-gray-500 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center shadow-lg shadow-orange-900/20"
          >
            {isRateLimited ? (
              'Rate Limited (Wait 1m)'
            ) : isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Converting to Mannequin...
              </>
            ) : (
              'Convert to Mannequin Bust'
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

export default MannequinHeadConverter;
