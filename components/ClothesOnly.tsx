
import React, { useState, useCallback } from 'react';
import FeatureCard from './FeatureCard';
import ImageUploader from './ImageUploader';
import MaskEditor from './MaskEditor';
import { removeCharacter } from '../services/geminiService';
import type { ImageFile, HistoryItem } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { BrushIcon } from './icons/BrushIcon';

const dataUrlToFile = async (dataUrl: string, filename: string): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: 'image/png' });
};

interface ClothesOnlyProps {
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp' | 'tabId' | 'tabLabel'>) => void;
}

const ClothesOnly: React.FC<ClothesOnlyProps> = ({ addToHistory }) => {
  const [image, setImage] = useState<ImageFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  // New state for masking
  const [isEditingMask, setIsEditingMask] = useState(false);
  const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null);

  // FIX: Moved the handleClear function before handleGenerate to fix a "used before declaration" error.
  const handleClear = useCallback(() => {
    setImage(null);
    setIsLoading(false);
    setError(null);
    setIsEditingMask(false);
    setMaskDataUrl(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!image) {
      setError('Please upload an image first.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      let maskFile: File | undefined = undefined;
      if (maskDataUrl) {
          maskFile = await dataUrlToFile(maskDataUrl, 'mask.png');
      }

      const result = await removeCharacter(image.file, maskFile);
      addToHistory({
        resultImage: result,
        inputs: {
          sourceImage: image.previewUrl,
          maskImage: maskDataUrl,
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
  }, [image, maskDataUrl, addToHistory]);
  
  const handleMaskDone = (dataUrl: string) => {
    setMaskDataUrl(dataUrl);
    setIsEditingMask(false);
  };

  return (
    <FeatureCard>
      {isEditingMask && image ? (
        <MaskEditor 
            image={image} 
            onDone={handleMaskDone} 
            onCancel={() => setIsEditingMask(false)}
            initialMask={maskDataUrl}
        />
      ) : (
      <div>
        <h2 className="text-xl font-semibold mb-1 text-white">Isolate Clothing</h2>
        <p className="text-gray-400 mb-4 text-sm">Upload a photo to isolate clothes. Use the mask tool to select specific items. The result appears in the History panel.</p>
        <ImageUploader image={image} onFileSelect={(img) => { setImage(img); setMaskDataUrl(null); }} label="Source Image" />
        
        {image && (
            <div className="mt-6 bg-gray-700 p-3 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <BrushIcon className="h-6 w-6 text-purple-400" />
                    <div>
                        <h3 className="font-semibold text-white">Precision Masking</h3>
                        <p className="text-xs text-gray-400">{maskDataUrl ? 'Mask applied.' : 'Select specific clothing to isolate.'}</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsEditingMask(true)}
                    className="bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                >
                    {maskDataUrl ? 'Edit Mask' : 'Add Mask'}
                </button>
            </div>
        )}

        {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={handleGenerate}
            disabled={!image || isLoading || isRateLimited}
            className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-300 flex items-center justify-center"
          >
            {isRateLimited ? (
              'Rate Limited (Wait 1m)'
            ) : isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              'Generate Clothes Only Image'
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
      )}
    </FeatureCard>
  );
};

export default ClothesOnly;
