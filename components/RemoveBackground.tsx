
import React, { useState, useCallback } from 'react';
import FeatureCard from './FeatureCard';
import ImageUploader from './ImageUploader';
import { removeBackground as imglyRemoveBackground, type Config } from '@imgly/background-removal';
import type { ImageFile, HistoryItem } from '../types';
import { TrashIcon } from './icons/TrashIcon';

interface RemoveBackgroundProps {
  addToHistory?: (item: any) => void;
}

const RemoveBackground: React.FC<RemoveBackgroundProps> = ({ addToHistory }) => {
  const [image, setImage] = useState<ImageFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [progressValue, setProgressValue] = useState<number>(0);

  const handleClear = useCallback(() => {
    setImage(null);
    setIsLoading(false);
    setError(null);
    setProgressMsg('');
    setProgressValue(0);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!image) {
      setError('Please upload an image.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setProgressMsg('Loading AI Model (Offline)...');
    setProgressValue(0);

    try {
      const config: Config = {
        publicPath: 'https://unpkg.com/@imgly/background-removal-data@1.4.5/dist/',
        progress: (key, current, total) => {
          const ratio = current / total;
          setProgressValue(Math.round(ratio * 100));
          if (key.includes('fetch')) {
            setProgressMsg(`Downloading AI Models... ${Math.round(ratio * 100)}%`);
          } else if (key.includes('compute')) {
            setProgressMsg(`Processing Image... ${Math.round(ratio * 100)}%`);
          } else {
             setProgressMsg(`Initializing Engine... ${Math.round(ratio * 100)}%`);
          }
        }
      };

      const blob = await imglyRemoveBackground(image.previewUrl, config);
      const transparentUrl = URL.createObjectURL(blob);

      if (addToHistory) {
        addToHistory({
          resultImage: transparentUrl,
          tabId: 'remove-bg',
          tabLabel: 'Remove BG',
          inputs: {
            sourceImage: image.previewUrl,
            engine: 'Offline AI'
          }
        });
      }
      
      setProgressMsg('Complete!');
      setProgressValue(100);
    } catch (err) {
      setError('Failed to process image. Please try again.');
      console.error("Background Removal Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [image, addToHistory]);

  return (
    <FeatureCard>
      <div>
        <div className="flex justify-between items-start mb-1">
            <h2 className="text-xl font-semibold text-white">Smart Background Removal</h2>
            <span className="text-[10px] bg-emerald-900 border border-emerald-700 text-emerald-200 px-2 py-0.5 rounded font-bold uppercase tracking-wider">True Offline AI</span>
        </div>
        <p className="text-gray-400 mb-6 text-sm">Upload a photo to perfectly isolate the subject with zero background. Operates entirely on your device for strict privacy.</p>
        
        <ImageUploader image={image} onFileSelect={setImage} label="Source Image" />

        {isLoading && (
            <div className="mt-4 bg-gray-900 p-4 rounded-lg border border-gray-700">
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                    <span>{progressMsg}</span>
                    <span>{progressValue}%</span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300" 
                        style={{ width: `${progressValue}%` }}
                    />
                </div>
                <p className="text-[10px] text-gray-500 mt-2 text-center">First run downloads the 40MB WASM model. Subsequent uses are instant.</p>
            </div>
        )}

        {error && <p className="text-red-400 mt-4 text-center text-sm bg-red-900/30 p-2 rounded">{error}</p>}
        
        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={handleGenerate}
            disabled={!image || isLoading}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:bg-gray-500 disabled:from-gray-500 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center shadow-lg shadow-emerald-900/20 active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Extracting Subject...
              </>
            ) : (
              'Remove Background'
            )}
          </button>
          <button
              onClick={handleClear}
              className="p-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors"
              aria-label="Clear inputs"
              disabled={isLoading}
            >
              <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </FeatureCard>
  );
};

export default RemoveBackground;
