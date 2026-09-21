
import React, { useState, useCallback, useRef } from 'react';
import FeatureCard from './FeatureCard';
import { createGif } from '../services/geminiService';
import type { HistoryItem, ImageFile } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { PasteIcon } from './icons/PasteIcon';

interface GifBuilderProps {
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp' | 'tabId' | 'tabLabel'>) => void;
}

const GifBuilder: React.FC<GifBuilderProps> = ({ addToHistory }) => {
  const [frames, setFrames] = useState<ImageFile[]>([]);
  const [delay, setDelay] = useState(200); // ms per frame
  const [customWidth, setCustomWidth] = useState<string>('');
  const [customHeight, setCustomHeight] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: File[]) => {
      const newFrames: ImageFile[] = files
        .filter(f => f.type.startsWith('image/'))
        .map((file) => ({
            file,
            previewUrl: URL.createObjectURL(file)
        }));
      
      if (newFrames.length > 0) {
          setFrames(prev => [...prev, ...newFrames]);
          setError(null);
      }
  };

  const handleAddFrames = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
    // Reset input
    if (e.target) e.target.value = '';
  };

  const handleRemoveFrame = (index: number) => {
    setFrames(prev => prev.filter((_, i) => i !== index));
  };

  const moveFrame = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= frames.length) return;
    const newFrames = [...frames];
    const [moved] = newFrames.splice(fromIndex, 1);
    newFrames.splice(toIndex, 0, moved);
    setFrames(newFrames);
  };

  const handleClear = () => {
    setFrames([]);
    setError(null);
    setProgress(0);
    setCustomWidth('');
    setCustomHeight('');
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        addFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Paste Handlers
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    const files: File[] = [];
    let hasImage = false;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
            const file = items[i].getAsFile();
            if (file) {
                files.push(file);
                hasImage = true;
            }
        }
    }
    if (hasImage) {
        e.preventDefault();
        e.stopPropagation();
        addFiles(files);
    }
  };

  const handlePasteClick = async () => {
    try {
        const clipboardItems = await navigator.clipboard.read();
        const files: File[] = [];
        for (const item of clipboardItems) {
            const imageType = item.types.find(type => type.startsWith('image/'));
            if (imageType) {
                const blob = await item.getType(imageType);
                const file = new File([blob], `pasted-${Date.now()}.png`, { type: imageType });
                files.push(file);
            }
        }
        if (files.length > 0) {
            addFiles(files);
        } else {
            setError("No image found in clipboard.");
            setTimeout(() => setError(null), 3000);
        }
    } catch (err) {
        console.error("Paste failed", err);
        setError("Could not paste from clipboard. Please allow permissions.");
        setTimeout(() => setError(null), 3000);
    }
  };

  const handleGenerate = useCallback(async () => {
    if (frames.length < 2) {
      setError('Please add at least 2 frames.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setProgress(0);

    try {
      // Use the local engine directly
      const result = await createGif(
        frames.map(f => f.file), 
        delay, 
        customWidth ? parseInt(customWidth) : null,
        customHeight ? parseInt(customHeight) : null,
        (p) => setProgress(Math.round(p * 100))
      );
      
      addToHistory({
        resultImage: result,
        inputs: {
            frameCount: frames.length,
            delay: delay,
            dimensions: customWidth && customHeight ? `${customWidth}x${customHeight}` : 'Auto (Max)'
        }
      });
    } catch (err) {
      setError('Failed to create GIF. ' + (err instanceof Error ? err.message : ''));
      console.error(err);
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  }, [frames, delay, customWidth, customHeight, addToHistory]);

  return (
    <FeatureCard>
      <div 
        onPaste={handlePaste} 
        tabIndex={0} 
        className="outline-none"
      >
        <h2 className="text-xl font-semibold mb-1 text-white">Professional GIF Studio</h2>
        <p className="text-gray-400 mb-4 text-sm">Create high-quality, artifact-free animated GIFs offline. Drag & drop images or paste from clipboard.</p>
        
        <div className="mb-6">
            <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                ref={fileInputRef}
                onChange={handleAddFrames}
            />
            <div 
                className={`w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors relative ${isDragging ? 'border-purple-500 bg-gray-700' : 'border-gray-600 bg-gray-800/50 hover:border-purple-500 hover:text-purple-400 text-gray-400'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div 
                    className="flex flex-col items-center justify-center w-full h-full cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span className="font-medium text-sm">{isDragging ? 'Drop frames here' : 'Click to Upload or Drag & Drop'}</span>
                </div>
                
                {/* Paste Button absolute positioned */}
                <button
                    onClick={(e) => { e.stopPropagation(); handlePasteClick(); }}
                    className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-full shadow-md transition-colors border border-gray-600 group"
                    title="Paste image from clipboard"
                >
                    <PasteIcon className="h-4 w-4 text-gray-300 group-hover:text-white" />
                </button>
            </div>
        </div>

        {frames.length > 0 && (
            <div className="mb-6 space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300">Timeline ({frames.length} frames)</span>
                    <button onClick={handleClear} className="text-xs text-red-400 hover:text-red-300">Clear All</button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar snap-x">
                    {frames.map((frame, idx) => (
                        <div key={idx} className="relative flex-shrink-0 w-24 h-24 group snap-start">
                            <img src={frame.previewUrl} alt={`Frame ${idx}`} className="w-full h-full object-contain bg-black/50 rounded-md border border-gray-700" style={{imageRendering: 'pixelated'}} />
                            <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-bl-md">
                                <button onClick={() => handleRemoveFrame(idx)} className="text-red-400 hover:text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => moveFrame(idx, idx-1)} disabled={idx===0} className="text-white disabled:text-gray-500 hover:text-purple-400">&lt;</button>
                                <span className="text-[10px] text-white">{idx+1}</span>
                                <button onClick={() => moveFrame(idx, idx+1)} disabled={idx===frames.length-1} className="text-white disabled:text-gray-500 hover:text-purple-400">&gt;</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
                 <label className="block text-sm font-medium text-gray-300 mb-2">Frame Delay (Speed)</label>
                 <input 
                    type="range" 
                    min="50" 
                    max="1000" 
                    step="50" 
                    value={delay} 
                    onChange={(e) => setDelay(Number(e.target.value))}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                 />
                 <div className="flex justify-between text-xs text-gray-500 mt-1">
                     <span>Fast (50ms)</span>
                     <span className="font-bold text-gray-300">{delay}ms</span>
                     <span>Slow (1s)</span>
                 </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Width (px)</label>
                    <input 
                        type="number" 
                        placeholder="Auto"
                        value={customWidth}
                        onChange={(e) => setCustomWidth(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-purple-500 outline-none"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Height (px)</label>
                    <input 
                        type="number" 
                        placeholder="Auto"
                        value={customHeight}
                        onChange={(e) => setCustomHeight(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-purple-500 outline-none"
                    />
                 </div>
                 <p className="col-span-2 text-[10px] text-gray-500">* Leave empty to auto-fit to the largest image.</p>
            </div>
        </div>

        {error && <p className="text-red-400 mt-4 text-center">{error}</p>}

        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={handleGenerate}
            disabled={frames.length < 2 || isLoading}
            className="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold py-3 px-4 rounded-lg hover:from-pink-700 hover:to-rose-700 disabled:bg-gray-500 disabled:from-gray-500 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center shadow-lg shadow-pink-900/20"
          >
            {isLoading ? (
              <>
                 <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Encoding GIF {progress > 0 && `(${progress}%)`}...
              </>
            ) : (
              'Create GIF'
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

export default GifBuilder;
