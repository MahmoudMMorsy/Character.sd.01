
import React, { useState, useCallback } from 'react';
import FeatureCard from './FeatureCard';
import ImageUploader from './ImageUploader';
import { generateGhostMannequin } from '../services/geminiService';
import type { ImageFile, HistoryItem } from '../types';
import { TrashIcon } from './icons/TrashIcon';

interface GhostMannequinProps {
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp' | 'tabId' | 'tabLabel'>) => void;
}

const GhostMannequin: React.FC<GhostMannequinProps> = ({ addToHistory }) => {
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
      const result = await generateGhostMannequin(image.file);
      addToHistory({
        resultImage: result,
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
        setError('Failed to process image. Please try again.');
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
        <h2 className="text-xl font-semibold mb-1 text-white">Ghost Mannequin Product Shot</h2>
        <p className="text-gray-400 mb-4 text-sm">
            Turn model photos into crisp e-commerce product shots. Removes body and background, preserving 3D fabric volume.
        </p>
        <ImageUploader image={image} onFileSelect={setImage} label="Model Wearing Product" />
        
        <div className="mt-4 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
             <div className="flex gap-3">
                 <div className="bg-gray-800 p-2 rounded border border-gray-600 w-12 h-12 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                 </div>
                 <div className="flex flex-col justify-center">
                     <span className="text-gray-400 text-xs">Input</span>
                     <span className="text-gray-200 font-bold text-sm">Model</span>
                 </div>
                 <div className="flex items-center text-gray-500">→</div>
                 <div className="bg-gray-800 p-2 rounded border border-gray-600 w-12 h-12 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m-2.828-7.072a2 2 0 010 2.828m-2.829-2.828a2 2 0 000 2.828m2.829-2.828a5 5 0 000 7.072m2.828-7.072a5 5 0 010 7.072M9 12l2 2 4-4m6-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 </div>
                 <div className="flex flex-col justify-center">
                     <span className="text-gray-400 text-xs">Output</span>
                     <span className="text-gray-200 font-bold text-sm">Product</span>
                 </div>
             </div>
        </div>

        {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        
        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={handleGenerate}
            disabled={!image || isLoading || isRateLimited}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:bg-gray-500 disabled:from-gray-500 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center shadow-lg shadow-emerald-900/20"
          >
            {isRateLimited ? (
              'Rate Limited (Wait 1m)'
            ) : isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Extracting Product...
              </>
            ) : (
              'Generate Product Shot'
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

export default GhostMannequin;
