import React, { useState, useCallback, useRef } from 'react';
import FeatureCard from './FeatureCard';
import { TrashIcon } from './icons/TrashIcon';
import type { HistoryItem } from '../types';

interface Layer {
    id: string;
    file: File;
    previewUrl: string;
    name: string;
    visible: boolean;
    opacity: number;
    x: number;
    y: number;
    scale: number;
}

interface LayerComposerProps {
    addToHistory?: (item: any) => void; // Using any or matching HistoryItem structure closely
}

const LayerComposer: React.FC<LayerComposerProps> = ({ addToHistory }) => {
    const [layers, setLayers] = useState<Layer[]>([]);
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    
    // dragging state
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragStart, setDragStart] = useState<{x: number, y: number, startX: number, startY: number} | null>(null);

    const handleAddLayer = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const filesList = Array.from(e.target.files) as File[];
            const newLayers = filesList.map(file => {
                return {
                    id: Math.random().toString(36).substr(2, 9),
                    file,
                    previewUrl: URL.createObjectURL(file),
                    name: file.name,
                    visible: true,
                    opacity: 1,
                    x: 0,
                    y: 0,
                    scale: 1,
                };
            });
            setLayers(prev => [...prev, ...newLayers]);
            setSelectedLayerId(newLayers[newLayers.length - 1].id);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const updateLayer = (id: string, updates: Partial<Layer>) => {
        setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    };

    const moveLayer = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index > 0) {
            const newLayers = [...layers];
            [newLayers[index - 1], newLayers[index]] = [newLayers[index], newLayers[index - 1]];
            setLayers(newLayers);
        } else if (direction === 'down' && index < layers.length - 1) {
            const newLayers = [...layers];
            [newLayers[index + 1], newLayers[index]] = [newLayers[index], newLayers[index + 1]];
            setLayers(newLayers);
        }
    };

    const removeLayer = (id: string) => {
        setLayers(prev => prev.filter(l => l.id !== id));
        if (selectedLayerId === id) setSelectedLayerId(null);
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            if (!previewRef.current) return;
            const containerRect = previewRef.current.getBoundingClientRect();
            
            // Export at double the visual size for higher quality
            const displayWidth = containerRect.width;
            const displayHeight = containerRect.height;
            const scaleFactor = 2; // Export multiplier

            const canvas = document.createElement('canvas');
            canvas.width = displayWidth * scaleFactor;
            canvas.height = displayHeight * scaleFactor;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Optional: draw empty transparent or white bg?
            // ctx.fillStyle = '#ffffff';
            // ctx.fillRect(0, 0, canvas.width, canvas.height);

            const imagesToLoad = layers.filter(l => l.visible).map(async (layer) => {
                const img = new Image();
                img.src = layer.previewUrl;
                await new Promise((resolve) => { img.onload = resolve; });
                return { img, layer };
            });

            const loadedImages = await Promise.all(imagesToLoad);

            loadedImages.forEach(({ img, layer }) => {
                ctx.globalAlpha = layer.opacity;
                // Layer's displayed width depends on its natural proportion relative to the canvas if not CSS-altered
                // But in DOM, img is just its natural size * scale, or constrained?
                // In our DOM, it has no width/height constraints other than `max-w-none` and `scale(layer.scale)`.
                // So its DOM width is natural_width * scale.
                const dw = img.naturalWidth * layer.scale * scaleFactor;
                const dh = img.naturalHeight * layer.scale * scaleFactor;
                
                const centerX = (displayWidth / 2 + layer.x) * scaleFactor;
                const centerY = (displayHeight / 2 + layer.y) * scaleFactor;
                
                ctx.drawImage(img, centerX - dw/2, centerY - dh/2, dw, dh);
            });

            const dataUrl = canvas.toDataURL('image/png');
            if (addToHistory) {
                addToHistory({
                    resultImage: dataUrl,
                    tabId: 'layer-composer',
                    tabLabel: 'Layer Composer',
                    inputs: { layerCount: layers.length },
                    userId: 'local' // usually ignored
                });
            }

            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `composition_${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Export failed", error);
        } finally {
            setIsExporting(false);
        }
    };

    // Drag handling for preview
    const handlePointerDown = (e: React.PointerEvent, id: string) => {
        setSelectedLayerId(id);
        const layer = layers.find(l => l.id === id);
        if (!layer) return;
        setDraggingId(id);
        setDragStart({ x: e.clientX, y: e.clientY, startX: layer.x, startY: layer.y });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (draggingId && dragStart) {
            const dx = e.clientX - dragStart.x;
            const dy = e.clientY - dragStart.y;
            updateLayer(draggingId, { x: dragStart.startX + dx, y: dragStart.startY + dy });
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setDraggingId(null);
        setDragStart(null);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

    return (
        <FeatureCard>
            <div className="flex flex-col md:flex-row gap-6">
                {/* Left: Settings & Layers */}
                <div className="flex-[0.8] flex flex-col gap-4">
                    <div>
                        <h2 className="text-xl font-semibold mb-1 text-white">Smart Layer Composer</h2>
                        <p className="text-gray-400 mb-4 text-sm">
                            Assemble multiple images using layers. Adjust position, scale, and opacity. Drag your images on the canvas.
                        </p>
                    </div>

                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 max-h-[400px] overflow-y-auto flex-1">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-medium text-gray-300">Layers ({layers.length})</h3>
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1.5 rounded transition-colors font-medium shadow"
                            >
                                + Add Image(s)
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleAddLayer}
                                className="hidden" 
                                accept="image/*"
                                multiple
                            />
                        </div>

                        <div className="flex flex-col-reverse gap-2">
                            {layers.map((layer, index) => (
                                <div 
                                    key={layer.id} 
                                    className={`p-2 rounded border ${selectedLayerId === layer.id ? 'border-purple-500 bg-purple-900/30' : 'border-gray-700 bg-gray-900/50'} flex flex-col gap-2 transition-colors cursor-pointer`}
                                    onClick={() => setSelectedLayerId(layer.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="checkbox" 
                                            checked={layer.visible}
                                            onChange={(e) => updateLayer(layer.id, { visible: e.target.checked })}
                                            className="w-4 h-4 rounded text-purple-600 bg-gray-800 border-gray-600"
                                        />
                                        <div className="w-10 h-10 rounded bg-black flex-shrink-0 overflow-hidden border border-gray-700">
                                            <img src={layer.previewUrl} alt="thumb" className="w-full h-full object-cover" />
                                        </div>
                                        <span className="text-sm text-gray-200 truncate flex-1">{layer.name}</span>
                                        <div className="flex items-center gap-1">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); moveLayer(index, 'down'); }}
                                                disabled={index === 0} 
                                                className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed p-1 bg-gray-800 rounded text-xs px-2"
                                                title="Move Down (Send to Back)"
                                            >
                                                ▼
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); moveLayer(index, 'up'); }}
                                                disabled={index === layers.length - 1} 
                                                className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed p-1 bg-gray-800 rounded text-xs px-2"
                                                title="Move Up (Bring to Front)"
                                            >
                                                ▲
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }}
                                                className="text-red-400 hover:text-red-300 p-1 ml-1 bg-red-900/20 rounded"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {selectedLayerId === layer.id && (
                                        <div className="pl-6 pr-2 py-2 grid grid-cols-2 gap-4 border-t border-gray-700/50 mt-1">
                                            <div>
                                                <label className="text-xs text-gray-400 mb-1 flex justify-between">
                                                    <span>Opacity</span>
                                                    <span>{Math.round(layer.opacity * 100)}%</span>
                                                </label>
                                                <input 
                                                    type="range" min="0" max="1" step="0.01" 
                                                    value={layer.opacity}
                                                    onChange={(e) => updateLayer(layer.id, { opacity: parseFloat(e.target.value) })}
                                                    className="w-full accent-purple-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-400 mb-1 flex justify-between">
                                                    <span>Scale</span>
                                                    <span>{layer.scale.toFixed(2)}x</span>
                                                </label>
                                                <input 
                                                    type="range" min="0.1" max="4" step="0.05" 
                                                    value={layer.scale}
                                                    onChange={(e) => updateLayer(layer.id, { scale: parseFloat(e.target.value) })}
                                                    className="w-full accent-purple-500"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {layers.length === 0 && (
                                <div className="text-center py-8 text-gray-500 text-sm border-2 border-dashed border-gray-700 rounded-lg bg-gray-900/50">
                                    No layers added yet. Click "+ Add Image"
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleExport}
                        disabled={layers.length === 0 || isExporting}
                        className="w-full mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:bg-gray-500 disabled:from-gray-500 disabled:to-gray-500 transition-all duration-300 shadow-lg"
                    >
                        {isExporting ? 'Exporting...' : 'Export Composition'}
                    </button>
                    
                    <button
                        onClick={() => { setLayers([]); setSelectedLayerId(null); }}
                        disabled={layers.length === 0}
                        className="w-full text-red-400 hover:text-red-300 py-2 rounded-lg bg-red-900/10 hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                        Clear All Layers
                    </button>
                </div>

                {/* Right: Canvas/Preview */}
                <div className="flex-1 flex flex-col justify-center border-t md:border-t-0 md:border-l border-gray-700 pt-6 md:pt-0 md:pl-6 min-h-[400px]">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-300">Live Canvas</label>
                        <span className="text-xs text-gray-500 animate-pulse">Drag layers to reposition</span>
                    </div>
                    <div 
                        ref={previewRef}
                        className="w-full aspect-square bg-gray-900 border border-gray-700 rounded-lg relative overflow-hidden bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iIzMzM2EzMyIgLz4KPHJlY3QgeD0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iIzIyMjIyMiIgLz4KPHJlY3QgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iIzIyMjIyMiIgLz4KPHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiMzMzNhMzMiIC8+Cjwvc3ZnPg==')] shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] touch-none"
                    >
                        {layers.map((layer, idx) => {
                            if (!layer.visible) return null;
                            const isSelected = selectedLayerId === layer.id;
                            return (
                                <img
                                    key={layer.id}
                                    src={layer.previewUrl}
                                    className={`absolute cursor-move select-none max-w-none ${isSelected ? 'ring-2 ring-purple-500 z-50' : ''}`}
                                    style={{
                                        opacity: layer.opacity,
                                        transform: `translate(-50%, -50%) translate(${layer.x}px, ${layer.y}px) scale(${layer.scale})`,
                                        left: '50%',
                                        top: '50%',
                                        zIndex: isSelected && draggingId === layer.id ? 999 : idx, // Bring jumping layer to front during drag, otherwise index
                                    }}
                                    onPointerDown={(e) => handlePointerDown(e, layer.id)}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                    onPointerCancel={handlePointerUp}
                                    draggable={false}
                                    alt={layer.name}
                                />
                            );
                        })}
                        {layers.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-500 pointer-events-none text-sm">
                                Empty Canvas
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </FeatureCard>
    );
};

export default LayerComposer;
