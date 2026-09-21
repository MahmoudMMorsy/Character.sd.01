
import React, { useState, useCallback, useRef, useEffect } from 'react';
import FeatureCard from './FeatureCard';
import ImageUploader from './ImageUploader';
import type { HistoryItem, ImageFile } from '../types';
import gifshot from 'gifshot';
import { detectSpriteFrames } from '../services/geminiService';
import { TrashIcon } from './icons/TrashIcon';
import { AnimationIcon } from './icons/AnimationIcon';

import { MagicWandIcon } from './icons/MagicWandIcon';

interface SpriteToGifConverterProps {
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp' | 'tabId' | 'tabLabel'>) => void;
}

const SpriteToGifConverter: React.FC<SpriteToGifConverterProps> = ({ addToHistory }) => {
  const [spriteSheet, setSpriteSheet] = useState<ImageFile | null>(null);
  const [cols, setCols] = useState(4);
  const [rows, setRows] = useState(1);
  const [frameCount, setFrameCount] = useState(4);
  const [delay, setDelay] = useState(100); // ms
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedFrames, setExtractedFrames] = useState<string[]>([]);
  const [customFrames, setCustomFrames] = useState<{ x: number; y: number; w: number; h: number }[] | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<number | null>(null);

  // Update frame count when cols/rows change
  useEffect(() => {
    setFrameCount(cols * rows);
  }, [cols, rows]);

  // Extract frames whenever sprite sheet, grid, or custom frames change
  useEffect(() => {
    if (!spriteSheet) {
      setExtractedFrames([]);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const frames: string[] = [];
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      if (customFrames && customFrames.length > 0) {
        setFrameCount(customFrames.length);
        for (const frame of customFrames) {
          tempCanvas.width = frame.w;
          tempCanvas.height = frame.h;
          tempCtx.clearRect(0, 0, frame.w, frame.h);
          tempCtx.drawImage(
            img,
            frame.x, frame.y, frame.w, frame.h,
            0, 0, frame.w, frame.h
          );
          frames.push(tempCanvas.toDataURL('image/png'));
        }
      } else {
        const frameWidth = img.width / cols;
        const frameHeight = img.height / rows;
        tempCanvas.width = frameWidth;
        tempCanvas.height = frameHeight;

        for (let i = 0; i < frameCount; i++) {
          const col = i % cols;
          const row = Math.floor(i / cols);

          tempCtx.clearRect(0, 0, frameWidth, frameHeight);
          tempCtx.drawImage(
            img,
            col * frameWidth, row * frameHeight, frameWidth, frameHeight,
            0, 0, frameWidth, frameHeight
          );
          frames.push(tempCanvas.toDataURL('image/png'));
        }
      }
      setExtractedFrames(frames);
    };
    img.src = spriteSheet.previewUrl;
  }, [spriteSheet, cols, rows, frameCount, customFrames]);

  // Animation Preview Logic
  useEffect(() => {
    if (!spriteSheet || !isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = window.setInterval(() => {
      setCurrentFrame(prev => (prev + 1) % frameCount);
    }, delay);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [spriteSheet, frameCount, delay, isPlaying]);

  // Draw Preview Frame
  useEffect(() => {
    if (!spriteSheet || !canvasRef.current) return;

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let frameWidth, frameHeight, sx, sy, sw, sh;

      if (customFrames && customFrames[currentFrame]) {
        const frame = customFrames[currentFrame];
        frameWidth = frame.w;
        frameHeight = frame.h;
        sx = frame.x;
        sy = frame.y;
        sw = frame.w;
        sh = frame.h;
      } else {
        frameWidth = img.width / cols;
        frameHeight = img.height / rows;
        const col = currentFrame % cols;
        const row = Math.floor(currentFrame / cols);
        sx = col * frameWidth;
        sy = row * frameHeight;
        sw = frameWidth;
        sh = frameHeight;
      }

      canvas.width = frameWidth;
      canvas.height = frameHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        img,
        sx, sy, sw, sh,
        0, 0, frameWidth, frameHeight
      );
    };
    img.src = spriteSheet.previewUrl;
  }, [spriteSheet, currentFrame, cols, rows, customFrames]);

  const handleAiAutoSlice = async () => {
    if (!spriteSheet) return;
    setIsAiLoading(true);
    setError(null);
    try {
      const result = await detectSpriteFrames(spriteSheet.file);
      if (result.frames && result.frames.length > 0) {
        setCustomFrames(result.frames);
        setFrameCount(result.frames.length);
      } else if (result.cols && result.rows) {
        setCols(result.cols);
        setRows(result.rows);
        setFrameCount(result.cols * result.rows);
        setCustomFrames(null);
      }
    } catch (err) {
      setError("AI failed to analyze the sprite sheet. Please use manual grid settings.");
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!spriteSheet || extractedFrames.length === 0) return;
    setIsLoading(true);
    setError(null);

    try {
      const gifData = await new Promise<string>((resolve, reject) => {
        gifshot.createGIF({
          images: extractedFrames,
          gifWidth: canvasRef.current?.width || 512,
          gifHeight: canvasRef.current?.height || 512,
          interval: delay / 1000,
          numFrames: frameCount,
          frameDuration: 1,
          sampleInterval: 10,
          repeat: 0
        }, (obj: any) => {
          if (!obj.error) {
            resolve(obj.image);
          } else {
            reject(new Error(obj.errorMsg || "Failed to create GIF"));
          }
        });
      });

      setPreviewUrl(gifData);
      addToHistory({
        resultImage: gifData,
        inputs: {
          cols,
          rows,
          frameCount,
          delay: `${delay}ms`
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSpriteSheet(null);
    setPreviewUrl(null);
    setExtractedFrames([]);
    setCustomFrames(null);
    setError(null);
    setCurrentFrame(0);
  };

  return (
    <FeatureCard>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white">Sprite Slicer & GIF Maker</h2>
          <p className="text-gray-400 text-sm">Decompose your sprite sheets into individual frames and animate them.</p>
        </div>

        <ImageUploader 
          image={spriteSheet} 
          onFileSelect={setSpriteSheet} 
          label="Upload Sprite Sheet" 
        />

        {spriteSheet && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <button
                onClick={handleAiAutoSlice}
                disabled={isAiLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-full transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20 disabled:opacity-50"
              >
                {isAiLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    AI Analyzing...
                  </>
                ) : (
                  <>
                    <MagicWandIcon className="h-4 w-4" />
                    AI Auto-Slice
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-800/50 p-4 rounded-xl border border-gray-700">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">Grid Settings</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Columns (Horizontal)</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={cols} 
                      onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Rows (Vertical)</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={rows} 
                      onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Total Frames to Animate</label>
                  <input 
                    type="number" 
                    min="1" 
                    max={cols * rows}
                    value={frameCount} 
                    onChange={(e) => setFrameCount(Math.min(cols * rows, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Frame Delay: <span className="text-white font-bold">{delay}ms</span></label>
                  <input 
                    type="range" 
                    min="10" 
                    max="1000" 
                    step="10"
                    value={delay} 
                    onChange={(e) => setDelay(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${isPlaying ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white`}
                  >
                    {isPlaying ? 'Pause Preview' : 'Play Preview'}
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center bg-black/40 rounded-lg p-4 border border-gray-700 min-h-[200px]">
                <span className="text-[10px] text-gray-500 mb-2 uppercase tracking-widest">Live Animation Preview</span>
                <canvas 
                  ref={canvasRef} 
                  className="max-w-full max-h-[300px] object-contain shadow-2xl"
                  style={{ imageRendering: 'pixelated' }}
                />
                <div className="mt-2 text-[10px] text-gray-400">
                  Frame: {currentFrame + 1} / {frameCount}
                </div>
              </div>
            </div>

            {/* Extracted Frames Gallery */}
            <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700">
              <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-4">Decomposed Frames (Slices)</h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {extractedFrames.map((frame, idx) => (
                  <div key={idx} className="group relative bg-black/40 rounded border border-gray-700 p-1 hover:border-emerald-500 transition-colors">
                    <img 
                      src={frame} 
                      alt={`Frame ${idx}`} 
                      className="w-full h-auto object-contain"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded">
                      <a 
                        href={frame} 
                        download={`frame-${idx}.png`}
                        className="p-1 bg-emerald-600 rounded text-white hover:bg-emerald-500"
                        title="Download Frame"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                    </div>
                    <span className="absolute bottom-0 right-0 text-[8px] bg-black/80 text-gray-400 px-1 rounded-tl">{idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-900/50 text-red-400 p-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={!spriteSheet || isLoading}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-6 rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <AnimationIcon className="h-5 w-5" />
                Generate GIF
              </>
            )}
          </button>
          
          <button
            onClick={handleClear}
            disabled={!spriteSheet || isLoading}
            className="p-3 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 hover:text-white transition-colors border border-gray-600"
          >
            <TrashIcon className="h-6 w-6" />
          </button>
        </div>

        {previewUrl && (
          <div className="mt-8 animate-fade-in">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-emerald-400">Resulting GIF</span>
              <span className="text-[10px] bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-800">Ready</span>
            </h3>
            <div className="bg-black/60 rounded-2xl p-6 border border-gray-700 flex flex-col items-center shadow-2xl">
              <img 
                src={previewUrl} 
                alt="Generated GIF" 
                className="max-w-full h-auto rounded-lg shadow-inner"
                style={{ imageRendering: 'pixelated' }}
              />
              <a 
                href={previewUrl} 
                download="sprite-animation.gif"
                className="mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-8 rounded-full transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download GIF
              </a>
            </div>
          </div>
        )}
      </div>
    </FeatureCard>
  );
};

export default SpriteToGifConverter;
