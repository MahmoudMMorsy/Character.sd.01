import React, { useState, useCallback, useEffect, useRef } from 'react';
import FeatureCard from './FeatureCard';
import ImageUploader from './ImageUploader';
import type { ImageFile } from '../types';
import { TrashIcon } from './icons/TrashIcon';

interface GridSplitterProps {
  addToHistory?: (item: any) => void;
}

const GridSplitter: React.FC<GridSplitterProps> = ({ addToHistory }) => {
  const [image, setImage] = useState<ImageFile | null>(null);
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);
  const [rowFractions, setRowFractions] = useState<number[]>([]);
  const [colFractions, setColFractions] = useState<number[]>([]);
  const [snap, setSnap] = useState(true);

  const [results, setResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingElement, setDraggingElement] = useState<{type: 'row'|'col', index: number} | {type: 'vertex', rIdx: number, cIdx: number} | null>(null);

  useEffect(() => {
    setRowFractions(Array.from({ length: Math.max(1, rows) - 1 }).map((_, i) => (i + 1) / rows));
  }, [rows]);

  useEffect(() => {
    setColFractions(Array.from({ length: Math.max(1, cols) - 1 }).map((_, i) => (i + 1) / cols));
  }, [cols]);

  useEffect(() => {
    if (!draggingElement) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      
      let xFrac = (e.clientX - rect.left) / rect.width;
      let yFrac = (e.clientY - rect.top) / rect.height;
      
      if (snap) {
         xFrac = Math.round(xFrac * 20) / 20; // 5% snap
         yFrac = Math.round(yFrac * 20) / 20;
      }
      
      if (draggingElement.type === 'row' || draggingElement.type === 'vertex') {
          const rIdx = draggingElement.type === 'vertex' ? draggingElement.rIdx : draggingElement.index;
          setRowFractions(prev => {
              const next = [...prev];
              const min = rIdx === 0 ? 0.02 : next[rIdx - 1] + 0.02;
              const max = rIdx === next.length - 1 ? 0.98 : next[rIdx + 1] - 0.02;
              next[rIdx] = Math.max(min, Math.min(max, yFrac));
              return next;
          });
      }
      
      if (draggingElement.type === 'col' || draggingElement.type === 'vertex') {
          const cIdx = draggingElement.type === 'vertex' ? draggingElement.cIdx : draggingElement.index;
          setColFractions(prev => {
              const next = [...prev];
              const min = cIdx === 0 ? 0.02 : next[cIdx - 1] + 0.02;
              const max = cIdx === next.length - 1 ? 0.98 : next[cIdx + 1] - 0.02;
              next[cIdx] = Math.max(min, Math.min(max, xFrac));
              return next;
          });
      }
    };
    
    const handlePointerUp = () => {
      setDraggingElement(null);
    };
    
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingElement, snap]);


  const handleGenerate = useCallback(async () => {
    if (!image) {
      setError('Please upload an image.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResults([]);
    try {
        const pieces = await new Promise<string[]>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const width = img.width;
                const height = img.height;
                const outPieces: string[] = [];

                const colPts = [0, ...colFractions.map(f => f * width), width];
                const rowPts = [0, ...rowFractions.map(f => f * height), height];

                for (let y = 0; y < rows; y++) {
                    for (let x = 0; x < cols; x++) {
                        const sx = colPts[x];
                        const sy = rowPts[y];
                        const sw = colPts[x+1] - sx;
                        const sh = rowPts[y+1] - sy;

                        if (sw <= 0 || sh <= 0) continue;

                        const canvas = document.createElement('canvas');
                        canvas.width = Math.max(1, sw);
                        canvas.height = Math.max(1, sh);
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
                            outPieces.push(canvas.toDataURL('image/png'));
                        }
                    }
                }
                resolve(outPieces);
            };
            img.onerror = () => reject(new Error('Failed to load image for splitting.'));
            img.src = image.previewUrl;
        });
        
        setResults(pieces);

        if (addToHistory && pieces.length > 0) {
            addToHistory({
                resultImages: pieces, // We use resultImages for multiple image outputs
                inputs: {
                    sourceImage: image.previewUrl,
                    rows,
                    cols
                }
            });
        }
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to split image. Please try again.');
        console.error("Split generation error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [image, rows, cols, rowFractions, colFractions, addToHistory]);
  
  const handleClear = useCallback(() => {
    setImage(null);
    setRows(2);
    setCols(2);
    setResults([]);
    setIsLoading(false);
    setError(null);
  }, []);

  const downloadImage = (dataUrl: string, index: number) => {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `split_piece_${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <FeatureCard>
      <div>
        <h2 className="text-xl font-semibold mb-1 text-white">Smart Panel Splitter</h2>
        <p className="text-gray-400 mb-4 text-sm">
            Split an image into a flexible panel grid and export them individually. Drag the vertices and lines to adjust cell dimensions.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Rows</label>
                <input 
                    type="number" 
                    min="1" max="100" 
                    value={rows || ''} 
                    onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-gray-800 border bg-gray-900 border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
            </div>
            <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Columns</label>
                <input 
                    type="number" 
                    min="1" max="100" 
                    value={cols || ''} 
                    onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-gray-800 border bg-gray-900 border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
            </div>
        </div>

        <div className="mb-6 flex items-center justify-between">
             <label className="flex items-center gap-2 cursor-pointer touch-manipulation">
                <input
                    type="checkbox"
                    checked={snap}
                    onChange={(e) => setSnap(e.target.checked)}
                    className="w-4 h-4 text-cyan-600 bg-gray-800 border-gray-600 rounded focus:ring-cyan-500 focus:ring-2"
                />
                <span className="text-gray-300 text-sm font-medium">Enable 5% Snap (سناب)</span>
             </label>
        </div>

        {!image ? (
            <ImageUploader image={image} onFileSelect={setImage} label="Original Image" />
        ) : (
            <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-300">Live Grid Preview</label>
                    <button 
                        onClick={() => setImage(null)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors bg-red-400/10 px-2 py-1 rounded"
                    >
                        Remove Image
                    </button>
                </div>
                <div 
                    ref={containerRef}
                    className="relative w-full rounded-lg border border-gray-700 bg-gray-900 overflow-hidden group shadow-lg"
                    style={{ touchAction: 'none' }}
                >
                    <img src={image.previewUrl} alt="Preview" className="w-full h-auto block pointer-events-none select-none" draggable={false} />
                    
                    <div className="absolute inset-0 flex flex-col pointer-events-none">
                        {Array.from({ length: rows }).map((_, y) => {
                           const hFrac = (y === rows - 1 ? 1 : rowFractions[y]) - (y === 0 ? 0 : rowFractions[y-1]);
                           return (
                               <div key={y} className="flex flex-row w-full" style={{ height: `${hFrac * 100}%` }}>
                                   {Array.from({ length: cols }).map((_, x) => {
                                      const wFrac = (x === cols - 1 ? 1 : colFractions[x]) - (x === 0 ? 0 : colFractions[x-1]);
                                      return (
                                          <div key={x} className="h-full border border-cyan-500/50 bg-cyan-500/10 flex items-center justify-center shadow-[inset_0_0_10px_rgba(6,182,212,0.2)]" style={{ width: `${wFrac * 100}%` }}>
                                              <span className="text-cyan-300 font-mono text-[10px] font-bold bg-black/80 px-1 py-0.5 rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                                  {y * cols + x + 1}
                                              </span>
                                          </div>
                                      );
                                   })}
                               </div>
                           );
                        })}
                    </div>

                    <div className="absolute inset-0 z-10">
                        {colFractions.map((frac, i) => (
                            <div
                                key={`col-${i}`}
                                className="absolute top-0 bottom-0 w-8 -ml-4 cursor-col-resize flex justify-center hover:bg-white/10 transition-colors group/col"
                                style={{ left: `${frac * 100}%` }}
                                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setDraggingElement({ type: 'col', index: i }); }}
                            >
                                <div className="w-1 h-full bg-cyan-400 group-hover/col:bg-cyan-300 pointer-events-none transition-colors"></div>
                            </div>
                        ))}

                        {rowFractions.map((frac, i) => (
                            <div
                                key={`row-${i}`}
                                className="absolute left-0 right-0 h-8 -mt-4 cursor-row-resize flex items-center hover:bg-white/10 transition-colors group/row"
                                style={{ top: `${frac * 100}%` }}
                                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setDraggingElement({ type: 'row', index: i }); }}
                            >
                                <div className="h-1 w-full bg-cyan-400 group-hover/row:bg-cyan-300 pointer-events-none transition-colors"></div>
                            </div>
                        ))}

                        {rowFractions.map((rFrac, rIdx) => 
                            colFractions.map((cFrac, cIdx) => (
                                <div
                                    key={`vertex-${rIdx}-${cIdx}`}
                                    className="absolute w-12 h-12 -ml-6 -mt-6 rounded-full flex items-center justify-center cursor-move hover:scale-110 transition-transform group/vertex z-20"
                                    style={{ 
                                        top: `${rFrac * 100}%`,
                                        left: `${cFrac * 100}%`
                                    }}
                                    onPointerDown={(e) => { 
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setDraggingElement({ type: 'vertex', rIdx, cIdx }); 
                                    }}
                                >
                                   <div className="w-4 h-4 bg-white group-hover/vertex:bg-cyan-300 group-hover/vertex:scale-125 border-2 border-cyan-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)] pointer-events-none transition-all"></div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}
        
        {error && <p className="text-red-400 mt-4 text-center text-sm bg-red-900/30 p-2 rounded">{error}</p>}
        
        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={handleGenerate}
            disabled={!image || isLoading}
            className="w-full bg-gradient-to-r from-cyan-600 to-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:from-cyan-700 hover:to-emerald-700 disabled:bg-gray-500 disabled:from-gray-500 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center shadow-lg shadow-cyan-900/20 active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Splitting...
              </>
            ) : (
              'Export Grid Panels'
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

        {results.length > 0 && (
            <div className="mt-8 border-t border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-white mb-4">Exported Panels ({results.length})</h3>
                <div 
                    className="grid gap-2" 
                    style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                >
                    {results.map((res, i) => (
                        <div key={i} className="group relative rounded overflow-hidden bg-gray-800 aspect-square border border-gray-700">
                            <img src={res} alt={`Panel ${i+1}`} className="w-full h-full object-contain" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button 
                                    onClick={() => downloadImage(res, i)}
                                    className="bg-white text-black text-xs font-bold px-3 py-1.5 rounded hover:bg-gray-200 transition-colors active:scale-95"
                                >
                                    Download
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>
    </FeatureCard>
  );
};

export default GridSplitter;
