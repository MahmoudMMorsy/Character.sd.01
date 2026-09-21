
import React, { useState, useCallback } from 'react';
import FeatureCard from './FeatureCard';
import ImageUploader from './ImageUploader';
import { buildOutfit, generateClothing } from '../services/geminiService';
import type { ImageFile, HistoryItem } from '../types';
import { TrashIcon } from './icons/TrashIcon';

interface OutfitBuilderProps {
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp' | 'tabId' | 'tabLabel'>) => void;
}

const OutfitBuilder: React.FC<OutfitBuilderProps> = ({ addToHistory }) => {
  const [characterImage, setCharacterImage] = useState<ImageFile | null>(null);
  const [headwearImage, setHeadwearImage] = useState<ImageFile | null>(null);
  const [topImage, setTopImage] = useState<ImageFile | null>(null);
  const [bottomImage, setBottomImage] = useState<ImageFile | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  // New states for clothing generation
  const [clothingPrompt, setClothingPrompt] = useState('');
  const [generatedClothing, setGeneratedClothing] = useState<string | null>(null);
  const [isGeneratingClothing, setIsGeneratingClothing] = useState(false);
  const [clothingError, setClothingError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!characterImage) {
      setError('Please upload a character image.');
      return;
    }
    const clothingItems = [headwearImage, topImage, bottomImage]
        .filter((img): img is ImageFile => img !== null)
        .map(img => img.file);

    if (clothingItems.length === 0) {
      setError('Please upload at least one clothing item.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await buildOutfit(characterImage.file, clothingItems);
      addToHistory({
        resultImage: result,
        inputs: {
          characterImage: characterImage.previewUrl,
          headwearImage: headwearImage?.previewUrl,
          topImage: topImage?.previewUrl,
          bottomImage: bottomImage?.previewUrl,
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
  }, [characterImage, headwearImage, topImage, bottomImage, addToHistory]);

  const handleClear = useCallback(() => {
    setCharacterImage(null);
    setHeadwearImage(null);
    setTopImage(null);
    setBottomImage(null);
    setIsLoading(false);
    setError(null);
    // Clear clothing generator state too
    setClothingPrompt('');
    setGeneratedClothing(null);
    setIsGeneratingClothing(false);
    setClothingError(null);
  }, []);

  // New helper to convert data URL to File
  const dataUrlToFile = async (dataUrl: string, filename: string): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const mimeType = blob.type || 'image/png';
    return new File([blob], filename, { type: mimeType });
  };

  // New handler for generating clothing
  const handleGenerateClothing = useCallback(async () => {
    if (!clothingPrompt.trim()) {
      setClothingError('Please enter a description for the clothing.');
      return;
    }
    setIsGeneratingClothing(true);
    setClothingError(null);
    setGeneratedClothing(null);
    try {
      const result = await generateClothing(clothingPrompt);
      setGeneratedClothing(result);
    } catch (err) {
      if (err instanceof Error && (err.message.includes('429') || err.message.toUpperCase().includes('RESOURCE_EXHAUSTED'))) {
        setClothingError('Rate limit exceeded. Please wait a minute and try again.');
        setIsRateLimited(true);
        setTimeout(() => setIsRateLimited(false), 60000);
      } else {
        setClothingError('Failed to generate clothing. Please try again.');
        console.error(err);
      }
    } finally {
      setIsGeneratingClothing(false);
    }
  }, [clothingPrompt]);

  // New handler to use the generated clothing
  const useGeneratedClothing = async (type: 'headwear' | 'top' | 'bottom') => {
    if (!generatedClothing) return;
    try {
      const filename = `${clothingPrompt.trim().replace(/\s+/g, '_') || 'generated_clothing'}.png`;
      const file = await dataUrlToFile(generatedClothing, filename);
      const imageFile: ImageFile = { file, previewUrl: generatedClothing };

      switch (type) {
        case 'headwear':
          setHeadwearImage(imageFile);
          break;
        case 'top':
          setTopImage(imageFile);
          break;
        case 'bottom':
          setBottomImage(imageFile);
          break;
      }
    } catch (err) {
      console.error('Failed to use generated clothing:', err);
      setError('Could not use the generated image. Please try again.');
    }
  };

  return (
    <FeatureCard>
      <div>
        <h2 className="text-xl font-semibold mb-1 text-white">Outfit Builder</h2>
        <p className="text-gray-400 mb-4 text-sm">Build an outfit with individual items. The result appears in the History panel.</p>
        <div className="space-y-4">
          <ImageUploader image={characterImage} onFileSelect={setCharacterImage} label="Character Image" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ImageUploader image={headwearImage} onFileSelect={setHeadwearImage} label="Headwear" />
              <ImageUploader image={topImage} onFileSelect={setTopImage} label="Top" />
              <ImageUploader image={bottomImage} onFileSelect={setBottomImage} label="Bottom & Shoes" />
          </div>
        </div>
        
        <div className="mt-6 border-t-2 border-gray-700 pt-6">
          <h3 className="text-lg font-semibold mb-1 text-white">AI Clothing Generator</h3>
          <p className="text-gray-400 mb-4 text-sm">Describe a piece of clothing to generate it with AI.</p>
          <div className="flex flex-col gap-4">
            <textarea
              value={clothingPrompt}
              onChange={(e) => setClothingPrompt(e.target.value)}
              placeholder="e.g., a stylish red leather jacket"
              className="w-full h-20 bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
              disabled={isGeneratingClothing || isRateLimited}
            />
            <button
              onClick={handleGenerateClothing}
              disabled={isGeneratingClothing || !clothingPrompt.trim() || isRateLimited}
              className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-300 flex items-center justify-center"
            >
              {isRateLimited ? 'Rate Limited' : isGeneratingClothing ? 'Generating...' : 'Generate Clothing'}
            </button>
          </div>
          {(isGeneratingClothing || clothingError || generatedClothing) && (
            <div className="mt-4">
              <h4 className="text-md font-semibold mb-2 text-gray-300">Generated Item</h4>
              <div className="w-full h-48 bg-gray-900/50 rounded-lg border-2 border-gray-600 flex items-center justify-center">
                {isGeneratingClothing && <p className="text-gray-400">Generating...</p>}
                {clothingError && <p className="text-red-400 px-4 text-center">{clothingError}</p>}
                {generatedClothing && <img src={generatedClothing} alt="Generated clothing" className="max-h-full max-w-full object-contain p-2" />}
              </div>
              {generatedClothing && !isGeneratingClothing && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button onClick={() => useGeneratedClothing('headwear')} className="flex-1 bg-gray-600 text-white text-xs font-bold py-1.5 px-2 rounded hover:bg-gray-500 transition-colors">Use as Headwear</button>
                  <button onClick={() => useGeneratedClothing('top')} className="flex-1 bg-gray-600 text-white text-xs font-bold py-1.5 px-2 rounded hover:bg-gray-500 transition-colors">Use as Top</button>
                  <button onClick={() => useGeneratedClothing('bottom')} className="flex-1 bg-gray-600 text-white text-xs font-bold py-1.5 px-2 rounded hover:bg-gray-500 transition-colors">Use as Bottom</button>
                </div>
              )}
            </div>
          )}
        </div>
        {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={handleGenerate}
            disabled={!characterImage || (!headwearImage && !topImage && !bottomImage) || isLoading || isRateLimited}
            className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-300 flex items-center justify-center"
          >
            {isRateLimited ? 'Rate Limited (Wait 1m)' : isLoading ? 'Building Outfit...' : 'Generate Outfit'}
          </button>
          <button
              onClick={handleClear}
              className="p-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors"
              aria-label="Clear inputs"
              disabled={isLoading || isGeneratingClothing || isRateLimited}
            >
              <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </FeatureCard>
  );
};

export default OutfitBuilder;
