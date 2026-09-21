import React, { useState, useCallback } from 'react';
import FeatureCard from './FeatureCard';
import ImageUploader from './ImageUploader';
import { convertToRealisticImage } from '../services/geminiService';
import type { ImageFile, HistoryItem } from '../types';
import { TrashIcon } from './icons/TrashIcon';

interface MakeRealisticProps {
  addToHistory?: (item: any) => void;
}

const MakeRealistic: React.FC<MakeRealisticProps> = ({ addToHistory }) => {
  const [image, setImage] = useState<ImageFile | null>(null);
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
      const result = await convertToRealisticImage(image);
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
        setError(err instanceof Error ? err.message : 'Failed to generate realistic image. Please try again.');
        console.error("Realistic generation error:", err);
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
        <h2 className="text-xl font-semibold mb-1 text-white">Make Realistic (تحويل لواقعي)</h2>
        <p className="text-gray-400 mb-4 text-sm">
            حول الصور المرفقة الي صور حقيقيه فاتنه وشديدة الجمال مع الحفاظ على نفس الالوان والكونسبت الاصلي للتشريح مفرطة الواقعية بجوده عاليه hd full hd باحدث كاميرا واعلي جوده 8k مع إصلاح اي خلل او رتوش اجعلها واقعيه وليست كرتون واقعي
        </p>
        <ImageUploader image={image} onFileSelect={setImage} label="Original Image" />
        
        {error && <p className="text-red-400 mt-4 text-center text-sm bg-red-900/30 p-2 rounded">{error}</p>}
        
        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={handleGenerate}
            disabled={!image || isLoading || isRateLimited}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:bg-gray-500 disabled:from-gray-500 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center shadow-lg shadow-blue-900/20"
          >
            {isRateLimited ? (
              'Rate Limited (Wait 1m)'
            ) : isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Converting to Real Life...
              </>
            ) : (
              'Make it Realistic'
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

export default MakeRealistic;
