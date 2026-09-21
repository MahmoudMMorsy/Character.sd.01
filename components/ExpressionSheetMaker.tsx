
import React, { useState, useCallback } from 'react';
import FeatureCard from './FeatureCard';
import ImageUploader from './ImageUploader';
import { generateExpressionSheet } from '../services/geminiService';
import type { ImageFile, HistoryItem } from '../types';
import { TrashIcon } from './icons/TrashIcon';

interface ExpressionSheetMakerProps {
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp' | 'tabId' | 'tabLabel'>) => void;
}

const ExpressionSheetMaker: React.FC<ExpressionSheetMakerProps> = ({ addToHistory }) => {
  const [image, setImage] = useState<ImageFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!image) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await generateExpressionSheet(image.file);
      addToHistory({ 
        resultImage: res, 
        tabLabel: '36 Expressions', 
        id: `expr-${Date.now()}`, 
        timestamp: Date.now(), 
        inputs: { source: image.previewUrl } 
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = useCallback(() => {
    setImage(null);
    setIsLoading(false);
    setError(null);
  }, []);

  return (
    <FeatureCard>
      <div className="flex justify-between items-start mb-2">
        <div>
            <h2 className="text-xl font-bold text-white">Cartoon Expressionist (36 Grid)</h2>
            <p className="text-gray-400 text-xs">
                Generates a 36-face sheet with <strong>"Squash & Stretch"</strong> physics (The Mask/Looney Tunes style).
                <br/>
                <span className="text-yellow-500">⚠ Strictly preserves Original Camera Angle & Identity.</span>
            </p>
        </div>
      </div>

      <ImageUploader image={image} onFileSelect={setImage} label="Character Reference" />

      {error && <p className="text-red-400 mt-4 text-center">{error}</p>}

      <div className="flex items-center gap-4 mt-6">
        <button 
            onClick={handleGenerate} 
            disabled={isLoading || !image} 
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-lg font-bold hover:from-orange-600 hover:to-red-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed shadow-lg shadow-orange-900/30 transition-all"
        >
            {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Animating 36 Faces...
                </span>
            ) : `Generate Expressions`}
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
    </FeatureCard>
  );
};

export default ExpressionSheetMaker;
