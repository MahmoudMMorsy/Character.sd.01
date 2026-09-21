
import React, { useState } from 'react';
import type { HistoryItem } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import { CopyIcon } from './icons/CopyIcon';
import { TrashIcon } from './icons/TrashIcon';
import { copyImageToClipboard } from '../services/clipboardUtils';

interface HistoryPanelProps {
    history: HistoryItem[];
    onClear: () => void;
    onDeleteItem: (id: string) => void;
    isMobileView?: boolean;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onClear, onDeleteItem, isMobileView = false }) => {
    const [copySuccessId, setCopySuccessId] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const handleDownload = (url: string, filename: string) => {
        const link = document.createElement('a');
        link.href = url;
        let fileExtension = 'png';
        if (url.startsWith('data:image/gif')) fileExtension = 'gif';
        else if (url.startsWith('blob:') || url.endsWith('.mp4')) fileExtension = 'mp4';
        
        link.download = `${filename}.${fileExtension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCopy = async (imageUrl: string, id: string) => {
        try {
            const success = await copyImageToClipboard(imageUrl);
            if (success) {
                setCopySuccessId(id);
                setTimeout(() => setCopySuccessId(null), 2000);
            }
        } catch (err) {
            console.warn('Could not copy image to clipboard:', err);
        }
    };

    return (
        <>
            <aside className={`w-full flex flex-col gap-4 h-full ${!isMobileView ? 'bg-[#2d333b] rounded-2xl p-6 sticky top-8 h-[calc(100vh-12rem)]' : 'p-4'}`}>
                {!isMobileView && (
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-white">History</h2>
                        <button
                            onClick={onClear}
                            disabled={history.length === 0}
                            className="text-gray-400 hover:text-white transition-colors p-2 disabled:text-gray-600 disabled:cursor-not-allowed"
                            title="Clear All History"
                        >
                            <TrashIcon className="h-5 w-5" />
                        </button>
                    </div>
                )}

                <div className={`flex-grow overflow-y-auto no-scrollbar ${!isMobileView ? 'pr-2 -mr-2' : ''}`}>
                    {history.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {history.map((item) => (
                                <div key={item.id} className="bg-[#1c2025] p-3 rounded-lg flex flex-col gap-3 border border-gray-800 shadow-sm relative group">
                                    
                                    {/* Delete Individual Item Button */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
                                        className="absolute top-2 right-2 bg-black/60 hover:bg-red-600/90 text-white p-1.5 rounded-full z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Delete this item"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>

                                    {item.resultVideo ? (
                                        // Video Result
                                        <div 
                                            className="aspect-square w-full bg-black/50 rounded-md overflow-hidden flex items-center justify-center relative bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')]"
                                        >
                                            {item.resultVideo.startsWith('data:image') ? (
                                                <img 
                                                    src={item.resultVideo} 
                                                    alt="Result" 
                                                    className="w-full h-full object-contain" 
                                                />
                                            ) : (
                                                <video 
                                                  src={item.resultVideo} 
                                                  controls
                                                  autoPlay
                                                  loop
                                                  muted
                                                  playsInline
                                                  className="w-full h-full object-contain" 
                                                />
                                            )}
                                        </div>
                                    ) : item.resultImages ? (
                                        // Multi-image Result (e.g., Decomposer or Grid Splitter)
                                        <div className="flex flex-col gap-4 w-full">
                                            {item.resultImages.map((img, idx) => (
                                                <div key={idx} className="flex flex-col gap-1 bg-black/40 p-2 rounded border border-gray-700">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs text-gray-300 font-bold uppercase mb-1 flex items-center gap-2">
                                                            <span className={`w-2 h-2 rounded-full ${
                                                                idx % 4 === 0 ? 'bg-purple-500' : 
                                                                idx % 4 === 1 ? 'bg-blue-500' : 
                                                                idx % 4 === 2 ? 'bg-green-500' : 
                                                                'bg-yellow-500'
                                                            }`}></span>
                                                            {item.tabId === 'decompose' ? (
                                                              idx === 0 ? "1. Full Body (T-Pose)" : 
                                                              idx === 1 ? "2. Head (Hair & Beard)" : 
                                                              idx === 2 ? "3. Clothes (Garments)" : 
                                                              "4. Acc (Props/Jewelry)"
                                                            ) : (
                                                              `Panel ${idx + 1}`
                                                            )}
                                                        </span>
                                                        <button
                                                            onClick={() => handleDownload(img, `${item.tabId}_piece_${idx+1}_${item.timestamp}`)}
                                                            className="text-[10px] bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded text-white"
                                                        >
                                                            Save
                                                        </button>
                                                    </div>
                                                    <div 
                                                        className="w-full bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] bg-gray-800 rounded overflow-hidden cursor-pointer hover:border-purple-500 border border-transparent transition-colors"
                                                        onClick={() => setPreviewImage(img)}
                                                    >
                                                        <img src={img} alt={`Layer ${idx+1}`} className="w-full h-auto object-contain" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        // Single Image Result
                                        <div 
                                            className="aspect-square w-full bg-black/50 rounded-md overflow-hidden flex items-center justify-center relative cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')]"
                                            onClick={() => setPreviewImage(item.resultImage)}
                                        >
                                            <img 
                                              src={item.resultImage} 
                                              alt={`Result for ${item.tabLabel}`} 
                                              className="w-full h-full object-contain" 
                                              style={{ imageRendering: 'pixelated' }}
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <div className="flex justify-between items-baseline mb-2">
                                            <p className="font-bold text-sm text-gray-200">{item.tabLabel}</p>
                                            <p className="text-[10px] text-gray-500">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                        </div>
                                        
                                        {!item.resultImages && (
                                            <div className={`grid ${item.resultVideo ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                                                <button
                                                    onClick={() => handleDownload(item.resultVideo || item.resultImage, `${item.tabId}_${item.timestamp}`)}
                                                    className="flex items-center justify-center gap-1.5 bg-gray-700 text-gray-200 font-semibold py-2 px-2 rounded-md hover:bg-gray-600 transition-colors text-xs"
                                                >
                                                    <DownloadIcon className="h-3.5 w-3.5" />
                                                    <span>Save</span>
                                                </button>
                                                {!item.resultVideo && (
                                                    <button
                                                        onClick={() => handleCopy(item.resultImage, item.id)}
                                                        className={`flex items-center justify-center gap-1.5 font-semibold py-2 px-2 rounded-md transition-colors text-xs ${copySuccessId === item.id ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
                                                    >
                                                        <CopyIcon className="h-3.5 w-3.5" />
                                                        <span>{copySuccessId === item.id ? 'Copied' : 'Copy'}</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isMobileView && (
                                <button onClick={onClear} className="col-span-full mt-4 py-3 text-red-400 text-sm font-medium border border-red-900/30 rounded-lg bg-red-900/10">
                                    Clear All History
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-700 rounded-lg text-gray-500">
                            <SparklesIcon className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">No creations yet.</p>
                        </div>
                    )}
                </div>
            </aside>

            {/* Lightbox / Fullscreen Modal */}
            {previewImage && (
                <div 
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setPreviewImage(null)}
                >
                    <button 
                        className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/50 p-2 rounded-full"
                        onClick={() => setPreviewImage(null)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    
                    <img 
                        src={previewImage} 
                        alt="Full Preview" 
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        style={{ imageRendering: 'pixelated' }} // Keep crisp for pixel art
                        onClick={(e) => e.stopPropagation()} 
                    />
                    
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDownload(previewImage, `full_image_${Date.now()}`); }}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-full font-bold shadow-lg transition-transform hover:scale-105 flex items-center gap-2"
                        >
                            <DownloadIcon className="h-5 w-5" />
                            Download Full Size
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

// Simple icon for empty state
const SparklesIcon = ({className}: {className?: string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
);

export default HistoryPanel;
