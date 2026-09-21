
import React, { useState, useCallback } from 'react';
import { remixImage } from '../services/geminiService';
import type { ImageFile, HistoryItem } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import FeatureCard from './FeatureCard';
import ImageUploader from './ImageUploader';

const PROMPTS = {
  clothes: "Take the clothes from the 'Clothes' image and put them on the person in the 'Character' image. The fit should be natural. CRITICAL: Maintain the character's original physical attributes with absolute precision. This includes their height, weight, body width, pose, and facial features. The character's body size and shape must not be altered in any way. The output must be identical in identity to the input character.",
  characterMerge: "Merge the person from the 'Character' image onto the person in the 'Pose' image. Transfer the complete likeness (face, hair, skin) and clothing from the 'Character' image. CRITICAL: You must preserve the exact pose and body shape from the 'Pose' image. The body's height, weight, and width in the final image must be identical to the 'Pose' image. The face must look exactly like the 'Character' image."
};

interface RemixProps {
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp' | 'tabId' | 'tabLabel'>) => void;
}

const Remix: React.FC<RemixProps> = ({ addToHistory }) => {
  const [characterImage, setCharacterImage] = useState<ImageFile | null>(null);
  const [clothesImage, setClothesImage] = useState<ImageFile | null>(null);
  const [mergeMode, setMergeMode] = useState<'clothes' | 'characterMerge'>('clothes');
  const [prompt, setPrompt] = useState(PROMPTS.clothes);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const handleGenerate = useCallback(async () => {
    const files = [characterImage, clothesImage].filter((img): img is ImageFile => img !== null).map(img => img.file);
    if (files.length < 2) {
      setError("Please upload both images for this mode.");
      return;
    }

    if (!prompt) {
      setError("Please enter a prompt.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await remixImage(files, prompt);
      if (result) {
        addToHistory({
          resultImage: result,
          inputs: {
            prompt: prompt,
            characterImage: characterImage?.previewUrl,
            clothesImage: clothesImage?.previewUrl,
            mergeMode: mergeMode,
          }
        });
      } else {
        setError('The model could not generate an image. Please try again.');
      }
    } catch (err) {
      if (err instanceof Error && (err.message.includes('429') || err.message.toUpperCase().includes('RESOURCE_EXHAUSTED'))) {
        setError('Rate limit exceeded. Please wait a minute and try again.');
        setIsRateLimited(true);
        setTimeout(() => setIsRateLimited(false), 60000);
      } else {
        console.error(err);
        setError('An error occurred during image generation. Please check the console.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [characterImage, clothesImage, prompt, mergeMode, addToHistory]);
  
  const handleClear = useCallback(() => {
    setCharacterImage(null);
    setClothesImage(null);
    setMergeMode('clothes');
    setPrompt(PROMPTS.clothes);
    setError(null);
  }, []);

  return (
    <FeatureCard>
      <div>
        <h2 className="text-xl font-semibold mb-1 text-white">Remix (High Fidelity)</h2>
        <p className="text-gray-400 mb-4 text-sm">Combine images with strict identity protocols. Results appear in the History panel.</p>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Merge Mode</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setMergeMode('clothes');
                  setPrompt(PROMPTS.clothes);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  mergeMode === 'clothes'
                    ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Clothes Only
              </button>
              <button
                onClick={() => {
                  setMergeMode('characterMerge');
                  setPrompt(PROMPTS.characterMerge);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  mergeMode === 'characterMerge'
                    ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Character Merge
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <ImageUploader image={characterImage} onFileSelect={setCharacterImage} label={mergeMode === 'clothes' ? 'Character' : 'Pose'} />
            <ImageUploader image={clothesImage} onFileSelect={setClothesImage} label={mergeMode === 'clothes' ? 'Clothes' : 'Character'} />
          </div>

          <div>
            <label htmlFor="remix-prompt" className="block text-sm font-medium text-gray-300 mb-2">
              Prompt (Strict Identity Mode Active)
            </label>
            <textarea
              id="remix-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your vision..."
              rows={6}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500 resize-none no-scrollbar"
            />
          </div>
        </div>

        {error && <p className="text-red-400 mt-4 text-center bg-red-900/50 p-3 rounded-lg">{error}</p>}

        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={handleGenerate}
            disabled={isLoading || !characterImage || !clothesImage || isRateLimited}
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
                Generating...
              </>
            ) : (
              'Generate Remix'
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

export default Remix;
