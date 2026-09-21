import React, { useState, useCallback } from 'react';
import FeatureCard from './FeatureCard';
import ImageUploader from './ImageUploader';
import { convertToRetroPixelSprite, RETRO_GAME_STYLES } from '../services/geminiService';
import type { ImageFile, RetroGameStyle } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { Download, Sparkles, Gamepad2 } from 'lucide-react';

interface RetroPixelSpriteProps {
  addToHistory?: (item: any) => void;
}

const RetroPixelSprite: React.FC<RetroPixelSpriteProps> = ({ addToHistory }) => {
  const [image, setImage] = useState<ImageFile | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<RetroGameStyle>('maple_story');
  const [isLoading, setIsLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
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
      const result = await convertToRetroPixelSprite(image, selectedStyle);
      setResultImage(result);
      if (addToHistory) {
        addToHistory({
          resultImage: result,
          inputs: {
            sourceImage: image.previewUrl,
            gameStyle: selectedStyle
          }
        });
      }
    } catch (err) {
      if (err instanceof Error && (err.message.includes('429') || err.message.toUpperCase().includes('RESOURCE_EXHAUSTED'))) {
        setError('Rate limit exceeded. Please wait a minute and try again.');
        setIsRateLimited(true);
        setTimeout(() => setIsRateLimited(false), 60000);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to generate pixel sprite. Please try again.');
        console.error("Pixel generation error:", err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [image, selectedStyle, addToHistory]);
  
  const handleClear = useCallback(() => {
    setImage(null);
    setResultImage(null);
    setIsLoading(false);
    setError(null);
  }, []);

  const handleDownload = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `pixel_spritesheet_${selectedStyle}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <FeatureCard>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-blue-600/20 text-blue-400 rounded-lg">
              <Gamepad2 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">Retro Pixel Sheet (5 Angles)</h2>
          </div>
          <p className="text-gray-400 text-sm">
            Transform any character photo into an authentic 5-angle retro video game sprite sheet (Front, Back, Left, Right, 3/4) isolated on a clean white background.
          </p>
        </div>

        {/* Game Style Preset Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Game Style Preset (طراز اللعبة)
            </label>
            <span className="text-[11px] text-blue-400 font-mono">
              {RETRO_GAME_STYLES.find(s => s.id === selectedStyle)?.era}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {RETRO_GAME_STYLES.map((style) => {
              const isSelected = selectedStyle === style.id;
              return (
                <div
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500 ring-1 ring-blue-500/50 shadow-md'
                      : 'bg-gray-900/60 border-gray-800 hover:border-gray-700 hover:bg-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-white truncate">{style.name}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      isSelected ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'
                    }`}>
                      {style.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                    {style.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Image Uploader */}
        <ImageUploader image={image} onFileSelect={setImage} label="Original Character Image" />
        
        {error && <p className="text-red-400 text-center text-sm bg-red-900/30 p-2.5 rounded-lg border border-red-800/40">{error}</p>}
        
        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={!image || isLoading || isRateLimited}
            className="flex-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold py-3 px-4 rounded-xl hover:from-blue-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2 text-sm"
          >
            {isRateLimited ? (
              'Rate Limited (Wait 1m)'
            ) : isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating {RETRO_GAME_STYLES.find(s => s.id === selectedStyle)?.name.split('(')[0].trim()} Sprite...
              </>
            ) : (
              <>
                <Gamepad2 className="w-4 h-4" />
                Generate {RETRO_GAME_STYLES.find(s => s.id === selectedStyle)?.name.split('(')[0].trim()} Sprite
              </>
            )}
          </button>
          <button
            onClick={handleClear}
            className="p-3 bg-gray-800 text-gray-300 hover:text-white rounded-xl hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Clear inputs"
            disabled={isLoading || isRateLimited}
            title="Clear"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Generated Result Preview */}
        {resultImage && (
          <div className="space-y-3 pt-4 border-t border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                ✓ Generated 5-Angle Sprite Sheet ({RETRO_GAME_STYLES.find(s => s.id === selectedStyle)?.name})
              </span>
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download PNG
              </button>
            </div>

            <div className="p-3 bg-white rounded-xl border border-gray-300 shadow-inner flex items-center justify-center overflow-x-auto">
              <img 
                src={resultImage} 
                alt="Generated Retro Pixel Sprite Sheet" 
                className="max-h-80 w-auto object-contain"
              />
            </div>
          </div>
        )}
      </div>
    </FeatureCard>
  );
};

export default RetroPixelSprite;
