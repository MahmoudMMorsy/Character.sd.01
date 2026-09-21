import React, { useState, useCallback } from 'react';
import FeatureCard from './FeatureCard';
import ImageUploader from './ImageUploader';
import { convertToAggressivePixelSprite } from '../services/geminiService';
import type { ImageFile } from '../types';
import { TrashIcon } from './icons/TrashIcon';

interface AggressivePixelSpriteProps {
  addToHistory?: (item: any) => void;
}

const AggressivePixelSprite: React.FC<AggressivePixelSpriteProps> = ({ addToHistory }) => {
  const [image, setImage] = useState<ImageFile | null>(null);
  const [mood, setMood] = useState<'aggressive' | 'normal'>('aggressive');
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
      const result = await convertToAggressivePixelSprite(image, mood);
      if (addToHistory) {
        addToHistory({
          resultImage: result,
          inputs: {
            sourceImage: image.previewUrl,
            mood: mood
          }
        });
      }
    } catch (err) {
      if (err instanceof Error && (err.message.includes('429') || err.message.toUpperCase().includes('RESOURCE_EXHAUSTED'))) {
        setError('Rate limit exceeded. Please wait a minute and try again.');
        setIsRateLimited(true);
        setTimeout(() => setIsRateLimited(false), 60000);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to generate pixel sprite. Please try again.');
        console.error("Pixel generation error:", err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [image, mood, addToHistory]);
  
  const handleClear = useCallback(() => {
    setImage(null);
    setMood('aggressive');
    setIsLoading(false);
    setError(null);
  }, []);

  return (
    <FeatureCard>
      <div>
        <h2 className="text-xl font-semibold mb-1 text-white">Aggressive Pixel Sprite</h2>
        <p className="text-gray-400 mb-4 text-sm">
            Transform yourself or any character into a high-detail 16-bit aggressive pixel art sprite. The AI will automatically detect the subject.
        </p>

        <div className="mb-4">
            <label className="block text-gray-300 text-sm font-medium mb-2">Character Mood</label>
            <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                        type="radio" 
                        name="mood" 
                        value="aggressive"
                        checked={mood === 'aggressive'}
                        onChange={() => setMood('aggressive')}
                        className="text-red-500 focus:ring-red-500 bg-gray-800 border-gray-700" 
                    />
                    <span className="text-white">Aggressive (Evil/Angry)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                        type="radio" 
                        name="mood" 
                        value="normal"
                        checked={mood === 'normal'}
                        onChange={() => setMood('normal')}
                        className="text-blue-500 focus:ring-blue-500 bg-gray-800 border-gray-700" 
                     />
                    <span className="text-white">Normal (Calm/Friendly)</span>
                </label>
            </div>
        </div>

        <ImageUploader image={image} onFileSelect={setImage} label="Original Image" />
        
        {error && <p className="text-red-400 mt-4 text-center text-sm bg-red-900/30 p-2 rounded">{error}</p>}
        
        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={handleGenerate}
            disabled={!image || isLoading || isRateLimited}
            className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold py-3 px-4 rounded-lg hover:from-red-700 hover:to-orange-700 disabled:bg-gray-500 disabled:from-gray-500 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center shadow-lg shadow-red-900/20"
          >
            {isRateLimited ? (
              'Rate Limited (Wait 1m)'
            ) : isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Sprite...
              </>
            ) : (
              'Generate 16-bit Sprite'
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

export default AggressivePixelSprite;
