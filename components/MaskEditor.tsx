
import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { ImageFile } from '../types';
import { TrashIcon } from './icons/TrashIcon';

interface MaskEditorProps {
  image: ImageFile;
  onDone: (maskDataUrl: string) => void;
  onCancel: () => void;
  initialMask?: string | null;
}

const MaskEditor: React.FC<MaskEditorProps> = ({ image, onDone, onCancel, initialMask }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(40);
  const [isErasing, setIsErasing] = useState(false);
  const lastPointRef = useRef<{x: number; y: number} | null>(null);
  
  const getCoords = (e: React.MouseEvent | React.TouchEvent): { x: number, y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e.nativeEvent) {
        clientX = (e.nativeEvent as TouchEvent).touches[0].clientX;
        clientY = (e.nativeEvent as TouchEvent).touches[0].clientY;
    } else {
        clientX = (e.nativeEvent as MouseEvent).clientX;
        clientY = (e.nativeEvent as MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const drawLine = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = isErasing ? 'black' : 'white';
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }, [brushSize, isErasing]);
  
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoords(e);
    if (!coords) return;
    setIsDrawing(true);
    lastPointRef.current = coords;
    // Draw a dot on single click
    drawLine(coords.x, coords.y, coords.x, coords.y);
  };
  
  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const coords = getCoords(e);
    if (!coords || !lastPointRef.current) return;
    
    drawLine(lastPointRef.current.x, lastPointRef.current.y, coords.x, coords.y);
    lastPointRef.current = coords;
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    lastPointRef.current = null;
  };
  
  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleDone = () => {
    const canvas = canvasRef.current;
    if (canvas) {
        onDone(canvas.toDataURL('image/png'));
    }
  };

  const setupCanvas = useCallback(() => {
    const imageEl = imageRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (!imageEl || !canvas || !ctx || !container) return;

    // Wait for the image to have dimensions
    if (imageEl.naturalWidth === 0) return;

    const { width, height, top, left } = imageEl.getBoundingClientRect();
    const { top: containerTop, left: containerLeft } = container.getBoundingClientRect();
    
    canvas.width = width;
    canvas.height = height;
    canvas.style.position = 'absolute';
    canvas.style.top = `${top - containerTop}px`;
    canvas.style.left = `${left - containerLeft}px`;

    if (initialMask) {
        const maskImage = new Image();
        maskImage.onload = () => {
            ctx.drawImage(maskImage, 0, 0, canvas.width, canvas.height);
        };
        maskImage.src = initialMask;
    } else {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [initialMask]);

  useEffect(() => {
    const imageEl = imageRef.current;
    if (!imageEl) return;
    
    const handleLoad = () => setupCanvas();
    imageEl.addEventListener('load', handleLoad);
    window.addEventListener('resize', setupCanvas);
    
    if (imageEl.complete && imageEl.naturalWidth > 0) {
        setupCanvas();
    }

    return () => {
        imageEl.removeEventListener('load', handleLoad);
        window.removeEventListener('resize', setupCanvas);
    };
  }, [setupCanvas]);

  return (
    <div className="space-y-4 border border-purple-500/50 bg-gray-800 p-4 rounded-lg">
        <div ref={containerRef} className="relative w-full aspect-square bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden">
            <img 
                ref={imageRef} 
                src={image.previewUrl} 
                alt="Image to mask" 
                className="max-w-full max-h-full block object-contain"
                crossOrigin="anonymous"
            />
            <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
                className="cursor-crosshair opacity-60 touch-none"
            />
        </div>
        <div className="bg-gray-700 p-3 rounded-lg space-y-4">
            <div className="flex items-center gap-4">
                <label htmlFor="brush-size" className="text-sm font-medium text-gray-300 whitespace-nowrap">Brush Size</label>
                <input
                    id="brush-size"
                    type="range"
                    min="2"
                    max="100"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={() => setIsErasing(false)}
                    className={`w-full py-2 text-sm rounded-md transition-colors ${!isErasing ? 'bg-purple-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}
                >
                    Brush
                </button>
                <button
                    onClick={() => setIsErasing(true)}
                    className={`w-full py-2 text-sm rounded-md transition-colors ${isErasing ? 'bg-purple-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}
                >
                    Eraser
                </button>
            </div>
        </div>
        <div className="flex items-center gap-4 mt-4">
            <button onClick={handleDone} className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors">Apply Mask</button>
            <button onClick={onCancel} className="w-full bg-gray-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors">Cancel</button>
            <button
                onClick={handleClear}
                className="p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                aria-label="Clear mask"
            >
                <TrashIcon className="h-5 w-5" />
            </button>
        </div>
    </div>
  );
};

export default MaskEditor;
