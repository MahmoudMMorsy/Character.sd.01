
import React, { useState, useCallback } from 'react';
import FeatureCard from './FeatureCard';
import { generateImage, getUseLocalEngine } from '../services/geminiService';
import type { HistoryItem } from '../types';
import { TrashIcon } from './icons/TrashIcon';

interface TextToImageProps {
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp' | 'tabId' | 'tabLabel'>) => void;
}

const TextToImage: React.FC<TextToImageProps> = ({ addToHistory }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const isLocal = !navigator.onLine || getUseLocalEngine();

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a description for the image.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await generateImage(prompt);
      addToHistory({
        resultImage: result,
        inputs: {
          prompt: prompt,
        }
      });
    } catch (err) {
      if (err instanceof Error && (err.message.includes('429') || err.message.toUpperCase().includes('RESOURCE_EXHAUSTED'))) {
        setError('Rate limit exceeded. Please wait a minute and try again.');
        setIsRateLimited(true);
        setTimeout(() => setIsRateLimited(false), 60000);
      } else {
        setError('Failed to generate image. Please try again.');
        console.error(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [prompt, addToHistory]);

  const handleClear = useCallback(() => {
    setPrompt('');
    setIsLoading(false);
    setError(null);
  }, []);

  return (
    <FeatureCard>
      <div>
        <h2 className="text-xl font-semibold mb-1 text-white">Text to Image</h2>
        <p className="text-gray-400 mb-2 text-sm">Describe an image to generate it using AI. The result will appear in the History panel.</p>
        
        {isLocal && (
           <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg flex gap-2 items-start">
               <span className="text-yellow-500 mt-0.5">⚠</span>
               <div className="text-xs text-yellow-200">
                   <strong>Offline Mode:</strong> You are using the local engine. Results will be abstract interpretations (Concept Art) based on your prompt's mood and colors. For photorealistic AI, please enable Online Mode.
               </div>
           </div>
        )}

        <div className="space-y-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={isLocal ? "e.g., Red fire abstract, Blue ocean mood..." : "e.g., A cyberpunk street fashion photoshoot with neon lights..."}
            className="w-full h-32 bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500 resize-none no-scrollbar"
            disabled={isLoading || isRateLimited}
          />
        </div>

        {error && <p className="text-red-400 mt-4 text-center">{error}</p>}

        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isLoading || isRateLimited}
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
                {isLocal ? 'Generating Art...' : 'Generating Image...'}
              </>
            ) : (
              'Generate'
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

export default TextToImage;
