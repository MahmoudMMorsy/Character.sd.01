
import React, { useState, useCallback, useRef } from 'react';
import FeatureCard from './FeatureCard';
import ImageUploader from './ImageUploader';
import { layerClothing } from '../services/geminiService';
import type { ImageFile, HistoryItem } from '../types';
import { CopyIcon } from './icons/CopyIcon';
import { PasteIcon } from './icons/PasteIcon';
import { TrashIcon } from './icons/TrashIcon';
import { copyImageToClipboard } from '../services/clipboardUtils';

interface LayeringProps {
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp' | 'tabId' | 'tabLabel'>) => void;
}

const Layering: React.FC<LayeringProps> = ({ addToHistory }) => {
  const [characterImage, setCharacterImage] = useState<ImageFile | null>(null);
  const [baseOutfitImage, setBaseOutfitImage] = useState<ImageFile | null>(null);
  const [accessoryImages, setAccessoryImages] = useState<ImageFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  
  const accessoryInputRef = useRef<HTMLInputElement>(null);

  const handleAddAccessory = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const newAccessory: ImageFile = {
        file,
        previewUrl: URL.createObjectURL(file),
      };
      setAccessoryImages(prev => [...prev, newAccessory]);
    }
    if(event.target) {
        event.target.value = "";
    }
  };

  const handleRemoveAccessory = (indexToRemove: number) => {
    setAccessoryImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  const handleCopyAccessory = async (e: React.MouseEvent, indexToCopy: number) => {
    e.stopPropagation();
    const imageToCopy = accessoryImages[indexToCopy];
    if (!imageToCopy) return;
    try {
        await copyImageToClipboard(imageToCopy.previewUrl || imageToCopy.file);
    } catch (err) {
        console.warn('Failed to copy accessory image:', err);
    }
  };

  const addAccessoryFromFile = (file: File) => {
    const newAccessory: ImageFile = {
        file,
        previewUrl: URL.createObjectURL(file),
    };
    setAccessoryImages(prev => [...prev, newAccessory]);
  };
  
  const handlePasteAccessory = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
            const file = items[i].getAsFile();
            if (file) {
                addAccessoryFromFile(file);
            }
            break;
        }
    }
  }, []);

  const handlePasteAccessoryClick = async () => {
    try {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
            const imageType = item.types.find(type => type.startsWith('image/'));
            if (imageType) {
                const blob = await item.getType(imageType);
                const file = new File([blob], `pasted-accessory.${imageType.split('/')[1]}`, { type: imageType });
                addAccessoryFromFile(file);
                return;
            }
        }
    } catch (err) {
        console.error('Failed to read from clipboard:', err);
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!characterImage) {
      setError('Please upload a character image.');
      return;
    }
    const clothingFiles = [baseOutfitImage, ...accessoryImages]
        .filter((img): img is ImageFile => img !== null)
        .map(img => img.file);

    if (clothingFiles.length === 0) {
      setError('Please upload at least one clothing item.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await layerClothing(characterImage.file, clothingFiles);
      addToHistory({
        resultImage: result,
        inputs: {
          characterImage: characterImage.previewUrl,
          baseOutfitImage: baseOutfitImage?.previewUrl,
          accessoryImages: accessoryImages.map(img => img.previewUrl),
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
  }, [characterImage, baseOutfitImage, accessoryImages, addToHistory]);
  
  const handleClear = useCallback(() => {
    setCharacterImage(null);
    setBaseOutfitImage(null);
    setAccessoryImages([]);
    setIsLoading(false);
    setError(null);
  }, []);

  return (
    <FeatureCard>
      <div>
        <h2 className="text-xl font-semibold mb-1 text-white">Clothing Layering</h2>
        <p className="text-gray-400 mb-4 text-sm">Dress a character with multiple layers. The result will appear in the History panel.</p>
        <div className="space-y-4">
          <ImageUploader image={characterImage} onFileSelect={setCharacterImage} label="Character Image" />
          <ImageUploader image={baseOutfitImage} onFileSelect={setBaseOutfitImage} label="Base Outfit" />
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Accessories / Top Layers</label>
            <div 
              className="flex flex-wrap items-start gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700 min-h-[7rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              onPaste={handlePasteAccessory}
              tabIndex={0}
              aria-label="Accessories area. Focus and press Ctrl+V to paste an accessory image."
            >
              {accessoryImages.map((image, index) => (
                <div key={index} className="relative w-24 h-24 group shrink-0">
                  <img src={image.previewUrl} alt={`Accessory ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                  <button
                    onClick={(e) => handleCopyAccessory(e, index)}
                    className="absolute top-1 left-1 bg-blue-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                    aria-label="Copy accessory"
                  >
                    <CopyIcon className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleRemoveAccessory(index)}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                    aria-label="Remove accessory"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
              <div className="flex flex-col gap-2">
                  <button
                    onClick={() => accessoryInputRef.current?.click()}
                    className="w-24 h-12 border-2 border-dashed border-gray-600 rounded-md flex flex-col items-center justify-center text-gray-400 hover:border-purple-500 hover:text-purple-400 transition-colors shrink-0"
                    aria-label="Add accessory image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    <span className="text-xs mt-1">Add</span>
                  </button>
                   <button
                    onClick={handlePasteAccessoryClick}
                    className="w-24 h-12 border-2 border-dashed border-gray-600 rounded-md flex flex-col items-center justify-center text-gray-400 hover:border-purple-500 hover:text-purple-400 transition-colors shrink-0"
                    aria-label="Paste accessory image"
                  >
                    <PasteIcon className="h-6 w-6" />
                    <span className="text-xs mt-1">Paste</span>
                  </button>
              </div>
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleAddAccessory}
                className="sr-only"
                ref={accessoryInputRef}
                multiple={false}
              />
            </div>
          </div>
        </div>
        {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={handleGenerate}
            disabled={!characterImage || (!baseOutfitImage && accessoryImages.length === 0) || isLoading || isRateLimited}
            className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-300 flex items-center justify-center"
          >
            {isRateLimited ? 'Rate Limited (Wait 1m)' : isLoading ? 'Generating...' : 'Apply Layers'}
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

export default Layering;
