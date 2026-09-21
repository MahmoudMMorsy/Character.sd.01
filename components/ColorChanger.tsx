
import React, { useState, useCallback } from 'react';
import FeatureCard from './FeatureCard';
import ImageUploader from './ImageUploader';
import MaskEditor from './MaskEditor';
import { changeColor } from '../services/geminiService';
import type { ImageFile, HistoryItem } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { BrushIcon } from './icons/BrushIcon';

// Helper function to convert data URL to File
const dataUrlToFile = async (dataUrl: string, filename: string): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: 'image/png' });
};

interface ColorChangerProps {
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp' | 'tabId' | 'tabLabel'>) => void;
}

const ColorChanger: React.FC<ColorChangerProps> = ({ addToHistory }) => {
  const [image, setImage] = useState<ImageFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemDescription, setItemDescription] = useState('shirt');
  const [color, setColor] = useState('#8b5cf6'); // Default to purple
  const [isRateLimited, setIsRateLimited] = useState(false);
  
  // New state for masking
  const [isEditingMask, setIsEditingMask] = useState(false);
  const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null);

  // FIX: Moved the handleClear function before handleGenerate to fix a "used before declaration" error.
  const handleClear = useCallback(() => {
    setImage(null);
    setIsLoading(false);
    setError(null);
    setItemDescription('shirt');
    setColor('#8b5cf6');
    setIsEditingMask(false);
    setMaskDataUrl(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!image) {
      setError('Please upload an image.');
      return;
    }
    if (!itemDescription && !maskDataUrl) {
      setError('Please describe the clothing item or add a mask.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let maskFile: File | undefined = undefined;
      if (maskDataUrl) {
          maskFile = await dataUrlToFile(maskDataUrl, 'mask.png');
      }
      
      const result = await changeColor(image.file, itemDescription, color, maskFile);

      addToHistory({
        resultImage: result,
        inputs: {
          sourceImage: image.previewUrl,
          itemDescription: itemDescription,
          color: color,
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
  }, [image, itemDescription, color, maskDataUrl, addToHistory]);
  
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
            <h2 className="text-xl font-semibold mb-1 text-white">Edit Image Color</h2>
            <p className="text-gray-400 mb-4 text-sm">Upload an image, describe the item, and pick a color. Use the mask tool for precision. The result will appear in the History panel.</p>
            <div className="space-y-6">
              <ImageUploader image={image} onFileSelect={(img) => { setImage(img); setMaskDataUrl(null); }} label="Source Image" />
            
              {image && (
                  <div className="bg-gray-700 p-3 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <BrushIcon className="h-6 w-6 text-purple-400" />
                          <div>
                              <h3 className="font-semibold text-white">Precision Masking</h3>
                              <p className="text-xs text-gray-400">{maskDataUrl ? 'Mask applied.' : 'Define a specific area to edit.'}</p>
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
            
              <div>
                  <label htmlFor="item-description" className="block text-sm font-medium text-gray-300 mb-2">
                  Clothing Item to Change {maskDataUrl && <span className="text-xs text-gray-400">(optional with mask)</span>}
                  </label>
                  <input
                  type="text"
                  id="item-description"
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder="e.g., shirt, dress, jacket"
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                  />
              </div>
              <div>
                  <label htmlFor="color-picker" className="block text-sm font-medium text-gray-300 mb-2">
                  New Color
                  </label>
                  <div className="flex items-center gap-4">
                  <input
                      type="color"
                      id="color-picker"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-12 h-10 p-1 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer"
                  />
                  <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                  </div>
              </div>
            </div>
            {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
            <div className="flex items-center gap-4 mt-6">
              <button
                  onClick={handleGenerate}
                  disabled={!image || isLoading || isRateLimited}
                  className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-300 flex items-center justify-center"
              >
                  {isRateLimited ? 'Rate Limited (Wait 1m)' : isLoading ? 'Changing Color...' : 'Change Color'}
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

export default ColorChanger;
