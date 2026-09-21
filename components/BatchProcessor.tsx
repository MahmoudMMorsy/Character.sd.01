import React, { useState, useRef, useCallback } from 'react';
import {
  FolderUp,
  Layers,
  Grid,
  Play,
  Square,
  Download,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Sliders,
  Image as ImageIcon,
  FileArchive,
  ArrowRight,
  Eye
} from 'lucide-react';
import JSZip from 'jszip';
import { convertToRetroPixelSprite, convertToAggressivePixelSprite, RETRO_GAME_STYLES } from '../services/geminiService';
import type { ImageFile, RetroGameStyle } from '../types';

interface BatchProcessorProps {
  addToHistory?: (item: any) => void;
}

export type TransformationType = 'retro_pixel' | 'aggressive_pixel';
export type AggressiveMood = 'aggressive' | 'normal';

export interface BatchItem {
  id: string;
  name: string;
  sourceImage: ImageFile;
  status: 'pending' | 'processing' | 'success' | 'failed';
  resultUrl?: string;
  error?: string;
}

const BatchProcessor: React.FC<BatchProcessorProps> = ({ addToHistory }) => {
  // Input mode: 'folder' (multiple files/folder) vs 'spritesheet' (single sheet sliced)
  const [inputMode, setInputMode] = useState<'folder' | 'spritesheet'>('folder');

  // Transformation configuration
  const [transformType, setTransformType] = useState<TransformationType>('retro_pixel');
  const [retroGameStyle, setRetroGameStyle] = useState<RetroGameStyle>('maple_story');
  const [aggressiveMood, setAggressiveMood] = useState<AggressiveMood>('aggressive');
  const [pacingDelay, setPacingDelay] = useState<number>(7500); // 7.5s safe pacing

  // Queue of items to process
  const [queue, setQueue] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const abortControllerRef = useRef<boolean>(false);

  // Sprite sheet slicing state
  const [sheetImage, setSheetImage] = useState<ImageFile | null>(null);
  const [sheetRows, setSheetRows] = useState<number>(2);
  const [sheetCols, setSheetCols] = useState<number>(2);
  const [isSlicing, setIsSlicing] = useState<boolean>(false);

  // Selected item for comparison preview modal
  const [previewItem, setPreviewItem] = useState<BatchItem | null>(null);

  // File input refs
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const sheetInputRef = useRef<HTMLInputElement>(null);

  // --- Helper: Convert File to ImageFile ---
  const fileToImageFile = (file: File): Promise<ImageFile> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          file,
          previewUrl: reader.result as string,
          base64: reader.result as string,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // --- Handle Multi-file Upload ---
  const handleMultipleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      alert('Please select valid image files (PNG, JPG, WEBP).');
      return;
    }

    const newItems: BatchItem[] = [];
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      try {
        const imgFile = await fileToImageFile(file);
        newItems.push({
          id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          sourceImage: imgFile,
          status: 'pending'
        });
      } catch (err) {
        console.warn(`Could not read file ${file.name}`, err);
      }
    }

    setQueue(prev => [...prev, ...newItems]);
  };

  // --- Handle Sprite Sheet Upload ---
  const handleSheetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) return;

    try {
      const imgFile = await fileToImageFile(file);
      setSheetImage(imgFile);
    } catch (err) {
      console.error("Failed to load sprite sheet", err);
    }
  };

  // --- Slice Sprite Sheet into Queue Items ---
  const handleSliceSheet = async () => {
    if (!sheetImage) return;
    setIsSlicing(true);

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = sheetImage.previewUrl;
      });

      const cellW = Math.floor(img.width / sheetCols);
      const cellH = Math.floor(img.height / sheetRows);

      const slicedItems: BatchItem[] = [];

      for (let r = 0; r < sheetRows; r++) {
        for (let c = 0; c < sheetCols; c++) {
          const canvas = document.createElement('canvas');
          canvas.width = cellW;
          canvas.height = cellH;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          ctx.drawImage(img, c * cellW, r * cellH, cellW, cellH, 0, 0, cellW, cellH);
          const dataUrl = canvas.toDataURL('image/png');

          // Convert dataURL to Blob / File
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const frameIndex = r * sheetCols + c + 1;
          const file = new File([blob], `${sheetImage.file.name.replace(/\.[^/.]+$/, "")}_frame_${frameIndex}.png`, { type: 'image/png' });

          slicedItems.push({
            id: `slice-${Date.now()}-${frameIndex}`,
            name: `Frame ${frameIndex} (R${r + 1}:C${c + 1})`,
            sourceImage: {
              file,
              previewUrl: dataUrl,
              base64: dataUrl
            },
            status: 'pending'
          });
        }
      }

      setQueue(prev => [...prev, ...slicedItems]);
      setInputMode('folder'); // Switch to queue view
    } catch (err: any) {
      alert(`Failed to slice sprite sheet: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSlicing(false);
    }
  };

  // --- Start Processing Queue ---
  const handleStartProcessing = async () => {
    if (queue.length === 0 || isProcessing) return;

    abortControllerRef.current = false;
    setIsProcessing(true);
    setProgressText("Starting batch processing...");

    const updatedQueue = [...queue];

    for (let i = 0; i < updatedQueue.length; i++) {
      if (abortControllerRef.current) {
        setProgressText("Batch processing paused by user.");
        break;
      }

      // Skip already successful items
      if (updatedQueue[i].status === 'success') {
        continue;
      }

      setCurrentIndex(i);
      updatedQueue[i].status = 'processing';
      updatedQueue[i].error = undefined;
      setQueue([...updatedQueue]);

      setProgressText(`Processing [${i + 1}/${updatedQueue.length}]: ${updatedQueue[i].name}...`);

      try {
        let resultUrl = '';
        if (transformType === 'retro_pixel') {
          resultUrl = await convertToRetroPixelSprite(updatedQueue[i].sourceImage, retroGameStyle);
        } else {
          resultUrl = await convertToAggressivePixelSprite(updatedQueue[i].sourceImage, aggressiveMood);
        }

        updatedQueue[i].status = 'success';
        updatedQueue[i].resultUrl = resultUrl;
        setQueue([...updatedQueue]);
      } catch (err: any) {
        console.error(`Batch item ${i + 1} failed:`, err);
        updatedQueue[i].status = 'failed';
        updatedQueue[i].error = err?.message || 'Transformation failed';
        setQueue([...updatedQueue]);
      }

      // Pacing delay between items to prevent Rate Limits (RPM)
      if (i < updatedQueue.length - 1 && !abortControllerRef.current) {
        setProgressText(`Cooling down (${pacingDelay / 1000}s) to prevent API rate limits...`);
        await new Promise(r => setTimeout(r, pacingDelay));
      }
    }

    setCurrentIndex(-1);
    setIsProcessing(false);
    setProgressText("Batch process finished!");

    // Save to history
    const successes = updatedQueue.filter(item => item.status === 'success' && item.resultUrl);
    if (addToHistory && successes.length > 0) {
      addToHistory({
        resultImages: successes.map(s => s.resultUrl!),
        inputs: {
          batchCount: successes.length,
          transformType,
          retroGameStyle: transformType === 'retro_pixel' ? retroGameStyle : undefined,
          aggressiveMood: transformType === 'aggressive_pixel' ? aggressiveMood : undefined
        }
      });
    }
  };

  // --- Stop Processing ---
  const handleStopProcessing = () => {
    abortControllerRef.current = true;
    setProgressText("Halting after current request completes...");
  };

  // --- Retry a single item ---
  const handleRetryItem = async (index: number) => {
    if (isProcessing) return;
    const item = queue[index];
    if (!item) return;

    const newQueue = [...queue];
    newQueue[index].status = 'processing';
    newQueue[index].error = undefined;
    setQueue(newQueue);

    try {
      let resultUrl = '';
      if (transformType === 'retro_pixel') {
        resultUrl = await convertToRetroPixelSprite(item.sourceImage, retroGameStyle);
      } else {
        resultUrl = await convertToAggressivePixelSprite(item.sourceImage, aggressiveMood);
      }

      newQueue[index].status = 'success';
      newQueue[index].resultUrl = resultUrl;
      setQueue([...newQueue]);
    } catch (err: any) {
      newQueue[index].status = 'failed';
      newQueue[index].error = err?.message || 'Retry failed';
      setQueue([...newQueue]);
    }
  };

  // --- Remove an item from queue ---
  const handleRemoveItem = (id: string) => {
    if (isProcessing) return;
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  // --- Clear Entire Queue ---
  const handleClearQueue = () => {
    if (isProcessing) return;
    setQueue([]);
    setProgressText('');
  };

  // --- Download Single Image ---
  const handleDownloadSingle = (dataUrl: string, name: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `pixel_${name.replace(/\.[^/.]+$/, "")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Download All as ZIP ---
  const handleDownloadAllZip = async () => {
    const completedItems = queue.filter(item => item.status === 'success' && item.resultUrl);
    if (completedItems.length === 0) return;

    const zip = new JSZip();
    completedItems.forEach((item, idx) => {
      const base64Data = item.resultUrl!.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
      const cleanName = item.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
      zip.file(`${idx + 1}_${cleanName}_pixel.png`, base64Data, { base64: true });
    });

    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `batch_pixel_sprites_${Date.now()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Stitch all results into a single consolidated Sprite Sheet ---
  const handleStitchSpriteSheet = async () => {
    const completedItems = queue.filter(item => item.status === 'success' && item.resultUrl);
    if (completedItems.length === 0) return;

    try {
      const loadedImages: HTMLImageElement[] = [];
      for (const item of completedItems) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = item.resultUrl!;
        });
        loadedImages.push(img);
      }

      // Calculate grid layout: columns and rows
      const count = loadedImages.length;
      const cols = Math.min(count, Math.ceil(Math.sqrt(count)));
      const rows = Math.ceil(count / cols);

      const maxW = Math.max(...loadedImages.map(img => img.width));
      const maxH = Math.max(...loadedImages.map(img => img.height));

      const canvas = document.createElement('canvas');
      canvas.width = cols * maxW;
      canvas.height = rows * maxH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Transparent or solid white background
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      loadedImages.forEach((img, idx) => {
        const c = idx % cols;
        const r = Math.floor(idx / cols);
        const x = c * maxW + (maxW - img.width) / 2;
        const y = r * maxH + (maxH - img.height) / 2;
        ctx.drawImage(img, x, y);
      });

      const sheetDataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = sheetDataUrl;
      link.download = `stitched_batch_spritesheet_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to stitch sprite sheet", err);
      alert("Failed to stitch sprite sheet. Try downloading as ZIP.");
    }
  };

  // Progress stats
  const completedCount = queue.filter(q => q.status === 'success').length;
  const failedCount = queue.filter(q => q.status === 'failed').length;
  const progressPercent = queue.length > 0 ? Math.round((completedCount / queue.length) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-[#1e293b] border border-gray-800 p-6 rounded-2xl shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-lg text-white">
                <Layers className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">Batch Pixel Processor</h2>
            </div>
            <p className="text-sm text-gray-400">
              Transform entire design folders or sliced character sprite sheets into <strong>Retro Pixel</strong> or <strong>Aggressive Pixel Boss</strong> art simultaneously.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-gray-900/80 p-1 rounded-xl border border-gray-700/60 shrink-0 self-start md:self-auto">
            <button
              onClick={() => setInputMode('folder')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                inputMode === 'folder'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <FolderUp className="w-3.5 h-3.5" />
              Folder / Multi-Designs
            </button>
            <button
              onClick={() => setInputMode('spritesheet')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                inputMode === 'spritesheet'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              Sprite Sheet Slicer
            </button>
          </div>
        </div>
      </div>

      {/* Input Section: Mode-Specific */}
      {inputMode === 'spritesheet' ? (
        <div className="bg-[#1e293b] border border-gray-800 p-6 rounded-2xl shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Grid className="w-4 h-4 text-indigo-400" />
              Upload & Slice Sprite Sheet
            </h3>
            <span className="text-xs text-gray-400">
              Upload a single sheet to automatically slice into individual batch frames
            </span>
          </div>

          {!sheetImage ? (
            <div
              onClick={() => sheetInputRef.current?.click()}
              className="border-2 border-dashed border-gray-700 hover:border-indigo-500 bg-gray-900/50 hover:bg-gray-900/80 rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <Grid className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Click or drag & drop a Character Sprite Sheet</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, or WEBP (e.g. 2x2, 1x4, 2x4 character grid)</p>
              </div>
              <input
                ref={sheetInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleSheetUpload}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-900/60 p-4 rounded-xl border border-gray-700/50">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-700 bg-black/40 shrink-0">
                    <img src={sheetImage.previewUrl} alt="Sheet" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white truncate max-w-xs">{sheetImage.file.name}</p>
                    <p className="text-xs text-gray-400">{(sheetImage.file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>

                {/* Slicing Controls */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-300 font-medium">Rows:</label>
                    <select
                      value={sheetRows}
                      onChange={e => setSheetRows(Number(e.target.value))}
                      className="bg-gray-800 border border-gray-700 text-white rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
                    >
                      {[1, 2, 3, 4, 5, 6, 8].map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-300 font-medium">Cols:</label>
                    <select
                      value={sheetCols}
                      onChange={e => setSheetCols(Number(e.target.value))}
                      className="bg-gray-800 border border-gray-700 text-white rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
                    >
                      {[1, 2, 3, 4, 5, 6, 8].map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => setSheetImage(null)}
                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded transition-colors"
                    title="Remove Sheet"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Visual Slice Preview with Overlay Grid */}
              <div className="relative max-h-72 bg-gray-950 rounded-xl overflow-hidden border border-gray-800 flex items-center justify-center p-2">
                <div className="relative inline-block max-h-64">
                  <img
                    src={sheetImage.previewUrl}
                    alt="Sheet Grid Preview"
                    className="max-h-64 object-contain rounded"
                  />
                  {/* Grid Lines Overlay */}
                  <div
                    className="absolute inset-0 pointer-events-none grid"
                    style={{
                      gridTemplateRows: `repeat(${sheetRows}, 1fr)`,
                      gridTemplateColumns: `repeat(${sheetCols}, 1fr)`
                    }}
                  >
                    {Array.from({ length: sheetRows * sheetCols }).map((_, i) => (
                      <div
                        key={i}
                        className="border border-indigo-500/50 bg-indigo-500/10 flex items-center justify-center"
                      >
                        <span className="text-[10px] font-mono font-bold text-indigo-300 bg-black/60 px-1 rounded">
                          #{i + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleSliceSheet}
                disabled={isSlicing}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isSlicing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Slicing {sheetRows * sheetCols} Frames...
                  </>
                ) : (
                  <>
                    <Grid className="w-4 h-4" />
                    Slice Sheet into {sheetRows * sheetCols} Batch Queue Items
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Folder / Multi-File Upload Area */
        <div className="bg-[#1e293b] border border-gray-800 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FolderUp className="w-4 h-4 text-indigo-400" />
              Add Character Designs
            </h3>
            <span className="text-xs text-gray-400">
              Select multiple files or drag a folder directly
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Multi File Selector */}
            <div
              onClick={() => multiFileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-700 hover:border-indigo-500 bg-gray-900/50 hover:bg-gray-900/80 rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <ImageIcon className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-white">Select Multiple Files</p>
              <p className="text-[11px] text-gray-400">Pick several character photos at once</p>
              <input
                ref={multiFileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={e => handleMultipleFiles(e.target.files)}
              />
            </div>

            {/* Folder / Directory Selector */}
            <div
              onClick={() => folderInputRef.current?.click()}
              className="border-2 border-dashed border-gray-700 hover:border-purple-500 bg-gray-900/50 hover:bg-gray-900/80 rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
            >
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                <FolderUp className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-white">Upload Folder of Designs</p>
              <p className="text-[11px] text-gray-400">Processes all images found in the directory</p>
              <input
                ref={folderInputRef}
                type="file"
                multiple
                // @ts-ignore
                webkitdirectory=""
                directory=""
                className="hidden"
                onChange={e => handleMultipleFiles(e.target.files)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Transformation Settings & Actions Bar */}
      <div className="bg-[#1e293b] border border-gray-800 p-6 rounded-2xl shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            Batch Transformation Settings
          </h3>
          <span className="text-xs text-indigo-400 font-mono">
            {queue.length} {queue.length === 1 ? 'Design' : 'Designs'} in Queue
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Style 1: Retro Pixel */}
          <div
            onClick={() => setTransformType('retro_pixel')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              transformType === 'retro_pixel'
                ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500'
                : 'bg-gray-900/40 border-gray-800 hover:border-gray-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                🕹️ Retro Pixel Sprite
              </span>
              <input
                type="radio"
                checked={transformType === 'retro_pixel'}
                onChange={() => setTransformType('retro_pixel')}
                className="accent-indigo-500"
              />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed mb-3">
              Generates classic 8-bit / 16-bit platformer sprite sheets with 5 distinct directional poses (Front, Back, Left, Right, 3/4) on pure white isolated background.
            </p>

            {/* Game Style dropdown when Retro Pixel is selected */}
            {transformType === 'retro_pixel' && (
              <div className="pt-2 border-t border-indigo-900/40 space-y-1.5" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-300 font-medium">Game Style:</span>
                  <span className="text-[10px] text-indigo-400 font-mono">
                    {RETRO_GAME_STYLES.find(s => s.id === retroGameStyle)?.badge}
                  </span>
                </div>
                <select
                  value={retroGameStyle}
                  onChange={e => setRetroGameStyle(e.target.value as RetroGameStyle)}
                  className="w-full bg-gray-900 border border-indigo-500/50 text-white rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  {RETRO_GAME_STYLES.map(style => (
                    <option key={style.id} value={style.id}>
                      {style.name} ({style.era})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 line-clamp-1 italic">
                  {RETRO_GAME_STYLES.find(s => s.id === retroGameStyle)?.description}
                </p>
              </div>
            )}
          </div>

          {/* Style 2: Aggressive Pixel Boss */}
          <div
            onClick={() => setTransformType('aggressive_pixel')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              transformType === 'aggressive_pixel'
                ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500'
                : 'bg-gray-900/40 border-gray-800 hover:border-gray-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                👾 Aggressive Pixel ("Pixel Boss")
              </span>
              <input
                type="radio"
                checked={transformType === 'aggressive_pixel'}
                onChange={() => setTransformType('aggressive_pixel')}
                className="accent-purple-500"
              />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed mb-3">
              Converts designs into menacing 16-bit dithered video game boss sprites with saturated pixel outlines and compact chibi proportions.
            </p>

            {/* Mood selector when Aggressive Pixel is selected */}
            {transformType === 'aggressive_pixel' && (
              <div className="flex items-center gap-2 pt-2 border-t border-purple-900/40">
                <span className="text-[11px] text-gray-300 font-medium">Boss Expression:</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setAggressiveMood('aggressive'); }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    aggressiveMood === 'aggressive'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Aggressive / Snarl
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setAggressiveMood('normal'); }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    aggressiveMood === 'normal'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Neutral / Idle
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Rate limit pacing configuration */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="text-gray-300 font-medium">Request Pacing (Anti-Rate Limit):</span>
            <select
              value={pacingDelay}
              onChange={e => setPacingDelay(Number(e.target.value))}
              disabled={isProcessing}
              className="bg-gray-800 border border-gray-700 text-white rounded px-2.5 py-1 text-xs"
            >
              <option value={7500}>Safe (7.5s - Prevents 429 errors)</option>
              <option value={5000}>Standard (5.0s)</option>
              <option value={2000}>Fast (2.0s - High Quota Accounts)</option>
            </select>
          </div>

          <span className="text-[11px] text-gray-500 italic">
            Automated cooldown prevents Google API limits from throttling the batch.
          </span>
        </div>

        {/* Batch Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-800">
          <div className="flex items-center gap-2">
            {!isProcessing ? (
              <button
                onClick={handleStartProcessing}
                disabled={queue.length === 0}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                Transform All ({queue.length} Images)
              </button>
            ) : (
              <button
                onClick={handleStopProcessing}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-2"
              >
                <Square className="w-4 h-4 fill-white" />
                Pause Processing
              </button>
            )}

            <button
              onClick={handleClearQueue}
              disabled={isProcessing || queue.length === 0}
              className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 hover:text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Queue
            </button>
          </div>

          {/* Export Action Buttons */}
          {completedCount > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleStitchSpriteSheet}
                className="px-4 py-2.5 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl shadow transition-colors flex items-center gap-1.5"
                title="Merge all completed sprites side-by-side into a single sprite sheet"
              >
                <Grid className="w-3.5 h-3.5" />
                Stitch into Sheet
              </button>

              <button
                onClick={handleDownloadAllZip}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow transition-colors flex items-center gap-1.5"
              >
                <FileArchive className="w-3.5 h-3.5" />
                Download All ({completedCount} PNGs as ZIP)
              </button>
            </div>
          )}
        </div>

        {/* Progress Bar & Status Text */}
        {isProcessing && (
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-xs text-gray-300">
              <span className="font-medium flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                {progressText}
              </span>
              <span className="font-mono text-indigo-400">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Queue Grid / Items Display */}
      {queue.length > 0 && (
        <div className="bg-[#1e293b] border border-gray-800 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Batch Queue & Transformed Sprites
            </h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-emerald-400 font-medium">✓ {completedCount} Done</span>
              {failedCount > 0 && <span className="text-red-400 font-medium">✗ {failedCount} Failed</span>}
              <span className="text-gray-400">Total: {queue.length}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {queue.map((item, idx) => (
              <div
                key={item.id}
                className={`bg-gray-900/70 border rounded-xl p-3 flex flex-col justify-between transition-all ${
                  currentIndex === idx
                    ? 'border-indigo-500 ring-2 ring-indigo-500/40 bg-indigo-950/20'
                    : item.status === 'success'
                    ? 'border-emerald-500/50 bg-emerald-950/10'
                    : item.status === 'failed'
                    ? 'border-red-500/50 bg-red-950/10'
                    : 'border-gray-800'
                }`}
              >
                {/* Header info */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-gray-400 truncate max-w-[120px]" title={item.name}>
                    #{idx + 1} {item.name}
                  </span>

                  {item.status === 'success' && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      <CheckCircle2 className="w-3 h-3" /> Done
                    </span>
                  )}
                  {item.status === 'processing' && (
                    <span className="flex items-center gap-1 text-[10px] text-indigo-400 font-semibold bg-indigo-500/10 px-1.5 py-0.5 rounded">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Processing
                    </span>
                  )}
                  {item.status === 'pending' && (
                    <span className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
                      <Clock className="w-3 h-3" /> Queued
                    </span>
                  )}
                  {item.status === 'failed' && (
                    <span className="flex items-center gap-1 text-[10px] text-red-400 font-semibold bg-red-500/10 px-1.5 py-0.5 rounded">
                      <AlertCircle className="w-3 h-3" /> Failed
                    </span>
                  )}
                </div>

                {/* Thumbnail Display: Before & After if completed */}
                <div className="aspect-square bg-black/40 rounded-lg overflow-hidden relative border border-gray-800 group">
                  {item.resultUrl ? (
                    <img
                      src={item.resultUrl}
                      alt={`Processed ${item.name}`}
                      className="w-full h-full object-contain bg-white"
                    />
                  ) : (
                    <img
                      src={item.sourceImage.previewUrl}
                      alt={`Source ${item.name}`}
                      className="w-full h-full object-contain opacity-70"
                    />
                  )}

                  {/* Overlay for failed state */}
                  {item.status === 'failed' && (
                    <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center p-2 text-center">
                      <AlertCircle className="w-6 h-6 text-red-400 mb-1" />
                      <p className="text-[10px] text-red-300 line-clamp-2">{item.error || 'Failed'}</p>
                      <button
                        onClick={() => handleRetryItem(idx)}
                        disabled={isProcessing}
                        className="mt-2 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded shadow transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {/* Processing Overlay */}
                  {item.status === 'processing' && (
                    <div className="absolute inset-0 bg-indigo-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-2 text-center">
                      <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mb-2" />
                      <span className="text-[11px] font-bold text-indigo-200">Transforming...</span>
                    </div>
                  )}

                  {/* Preview / Comparison button on hover */}
                  {item.resultUrl && (
                    <button
                      onClick={() => setPreviewItem(item)}
                      className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Compare Before / After"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Card footer actions */}
                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-gray-800/80">
                  {item.resultUrl ? (
                    <button
                      onClick={() => handleDownloadSingle(item.resultUrl!, item.name)}
                      className="flex-1 py-1 px-2 bg-gray-800 hover:bg-indigo-600 text-gray-300 hover:text-white text-[11px] font-semibold rounded flex items-center justify-center gap-1 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </button>
                  ) : (
                    <span className="text-[10px] text-gray-500 truncate">Source ready</span>
                  )}

                  {!isProcessing && (
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 text-gray-500 hover:text-red-400 rounded transition-colors"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison Modal (Before vs After) */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="bg-[#1e293b] border border-gray-700 max-w-2xl w-full p-6 rounded-2xl shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Pixel Art Comparison: {previewItem.name}
              </h3>
              <button
                onClick={() => setPreviewItem(null)}
                className="text-gray-400 hover:text-white text-xs font-bold px-2 py-1 bg-gray-800 rounded"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Original */}
              <div className="space-y-1.5 text-center">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Original Source</span>
                <div className="aspect-square bg-black/40 rounded-xl overflow-hidden border border-gray-800 flex items-center justify-center">
                  <img src={previewItem.sourceImage.previewUrl} alt="Original" className="max-h-full max-w-full object-contain" />
                </div>
              </div>

              {/* Transformed Pixel */}
              <div className="space-y-1.5 text-center">
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">Transformed Pixel Sprite</span>
                <div className="aspect-square bg-white rounded-xl overflow-hidden border border-indigo-500/50 flex items-center justify-center">
                  {previewItem.resultUrl && (
                    <img src={previewItem.resultUrl} alt="Pixel" className="max-h-full max-w-full object-contain" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              {previewItem.resultUrl && (
                <button
                  onClick={() => handleDownloadSingle(previewItem.resultUrl!, previewItem.name)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Pixel Sprite
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchProcessor;
