import React, { useState, useCallback, useRef } from 'react';
import FeatureCard from './FeatureCard';
import { convertToRetroCel } from '../services/geminiService';
import type { ImageFile } from '../types';
import { 
  Tv, 
  Film, 
  Palette, 
  Settings, 
  Upload, 
  Trash2, 
  Sparkles, 
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Info,
  Paintbrush
} from 'lucide-react';

interface RetroCelAnimationProps {
  addToHistory?: (item: any) => void;
}

type PresetType = 'book_cafe' | 'village_low_angle' | 'muted_palette' | 'vintage_ink_paint' | 'custom_template';

const PRESETS = [
  {
    id: 'book_cafe' as PresetType,
    title: 'Cafe Reading (TV Frame)',
    description: '1980s retro cel portrait of the subject reading a book in an illustrative cozy cafe inside a retro television frame.',
    icon: Tv,
    promptPreview: 'A close-up portrait with clean outlines, muted hand-painted flat colors in a cafe interior, presented inside a retro TV frame with soft film grain.'
  },
  {
    id: 'village_low_angle' as PresetType,
    title: 'Village Lookup (Film Strip)',
    description: '1980s low-angle traditional cel animation of the subject against an illustrative background village inside an imperfect film strip.',
    icon: Film,
    promptPreview: 'Low-angle looking up portrait of the subject with definitive black outlines and soft, muted colors, set in a village with imperfect film strip border.'
  },
  {
    id: 'muted_palette' as PresetType,
    title: 'Cel Animation (Muted & Grainy)',
    description: 'Classic standalone traditional retro cel animation aesthetic with expressive hand-cast outlines, muted palette and vintage paper texture.',
    icon: Palette,
    promptPreview: 'Highly stylistic 1980s retro cel animation with beautiful muted palettes, visible cel outlines, soft grain, and natural hand-made feel.'
  },
  {
    id: 'vintage_ink_paint' as PresetType,
    title: 'Vintage Hand-Inked Cel',
    description: 'Pure vintage, hand-drawn traditional animation keyframe with clean black outlines, hand-painted flat colors, and a nostalgic ambient background.',
    icon: Paintbrush,
    promptPreview: 'Vintage hand-inked, painted animation keyframe with definitive black outlines & a gentle nostalgic glow, seamlessly integrated.'
  },
  {
    id: 'custom_template' as PresetType,
    title: 'Custom Prompt Builder',
    description: 'Structure custom retro cel parameters such as Subject, Location, and Palette colors dynamically and render classic scenes.',
    icon: Settings,
    promptPreview: 'Retro cel animation style, a [Subject] in [Place], hand-painted background, visible cel lines, muted [Color 1] and [Color 2] palette...'
  }
];

const RetroCelAnimation: React.FC<RetroCelAnimationProps> = ({ addToHistory }) => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [activePreset, setActivePreset] = useState<PresetType>('book_cafe');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);

  // Custom parameters for Option 4
  const [subject, setSubject] = useState('');
  const [place, setPlace] = useState('');
  const [color1, setColor1] = useState('pastel teal');
  const [color2, setColor2] = useState('warm peach');

  // Custom parameters for Vintage Hand-Inked (vintage_ink_paint)
  const [vSubject, setVSubject] = useState('a close-up portrait of a man with sunglasses');
  const [vColors, setVColors] = useState('soft, muted, hand-painted flat colors, like a muted navy blue shirt');
  const [vAccessories, setVAccessories] = useState('sunglasses');
  const [vPatterns, setVPatterns] = useState('specific shirt pattern');
  const [vBackground, setVBackground] = useState('a classic European street with cafes');

  // Background control option (keep original background vs isolate subject without background)
  const [keepBackground, setKeepBackground] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelected = (files: FileList | null) => {
    if (!files) return;
    
    Array.from(files).forEach(file => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          setImages(prev => [
            ...prev,
            {
              file,
              previewUrl: URL.createObjectURL(file),
              base64,
            }
          ]);
        };
        reader.readAsDataURL(file);
      }
    });
    setError(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelected(event.target.files);
    if (event.target) {
      event.target.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelected(e.dataTransfer.files);
  };

  const handleGenerate = useCallback(async () => {
    if (images.length === 0) {
      setError('Please upload at least one image.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResultImageUrl(null);

    const customParams = activePreset === 'custom_template' ? {
      subject: subject || undefined,
      place: place || undefined,
      color1: color1 || undefined,
      color2: color2 || undefined
    } : activePreset === 'vintage_ink_paint' ? {
      vintageSubject: vSubject || undefined,
      vintageColors: vColors || undefined,
      vintageAccessories: vAccessories || undefined,
      vintagePatterns: vPatterns || undefined,
      vintageBackground: vBackground || undefined
    } : undefined;

    try {
      const result = await convertToRetroCel(images, activePreset, customParams, keepBackground);
      setResultImageUrl(result);
      
      if (addToHistory) {
        addToHistory({
          resultImage: result,
          inputs: {
            preset: activePreset,
            imagesCount: images.length,
            keepBackground,
            subject: activePreset === 'custom_template' ? (subject || 'N/A') : (vSubject || 'N/A'),
            place: activePreset === 'custom_template' ? (place || 'N/A') : (vBackground || 'N/A'),
            color1: activePreset === 'custom_template' ? (color1 || 'N/A') : (vColors || 'N/A'),
            color2: color2 || 'N/A',
          }
        });
      }
    } catch (err) {
      if (err instanceof Error && (err.message.includes('429') || err.message.toUpperCase().includes('RESOURCE_EXHAUSTED'))) {
        setError('Rate limit exceeded. Please wait a minute and try again.');
        setIsRateLimited(true);
        setTimeout(() => setIsRateLimited(false), 60000);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to generate retro cel illustration. Please try again.');
        console.error("Retro Cel Error:", err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [images, activePreset, subject, place, color1, color2, vSubject, vColors, vAccessories, vPatterns, vBackground, keepBackground, addToHistory]);

  const handleClear = () => {
    setImages([]);
    setResultImageUrl(null);
    setError(null);
    setSubject('');
    setPlace('');
    setColor1('pastel teal');
    setColor2('warm peach');
    setVSubject('a close-up portrait of a man with sunglasses');
    setVColors('soft, muted, hand-painted flat colors, like a muted navy blue shirt');
    setVAccessories('sunglasses');
    setVPatterns('specific shirt pattern');
    setVBackground('a classic European street with cafes');
    setKeepBackground(true);
  };

  return (
    <FeatureCard id="retro-cel-container">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-1 text-white flex items-center gap-2">
            <Tv className="h-6 w-6 text-purple-400" />
            Retro Cel Animator
          </h2>
          <p className="text-slate-400 text-sm">
            Transform uploaded subjects or scenes into breathtaking classic 1980s or 1990s traditional cel animation cells. Choose from classic cinematic contexts or design custom scene descriptions.
          </p>
        </div>

        {/* Multi-Image Upload Panel */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-300">Upload Source Image(s)</label>
          
          {images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2 animate-fade-in">
              {images.map((img, idx) => (
                <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-700 bg-slate-900/60 shadow-md">
                  <img src={img.previewUrl} alt={`Source ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <button
                      onClick={() => handleRemoveImage(idx)}
                      className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-all focus:outline-none"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="absolute bottom-1 right-1 bg-slate-900/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-300">
                    Img {idx + 1}
                  </span>
                </div>
              ))}
              
              {images.length < 4 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 hover:border-purple-500 bg-slate-800/20 text-slate-400 hover:text-purple-400 transition-all cursor-pointer"
                >
                  <Plus className="h-6 w-6 mb-1" />
                  <span className="text-[11px] font-medium">Add Photo</span>
                </button>
              )}
            </div>
          )}

          {images.length === 0 && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full py-10 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors duration-300 cursor-pointer ${
                isDragging ? 'border-purple-500 bg-slate-800/40' : 'border-slate-700 bg-slate-800/20 hover:border-purple-500'
              }`}
            >
              <Upload className="h-10 w-10 text-slate-500 mb-2" />
              <p className="font-semibold text-slate-300 text-sm">Drag and drop or click to upload</p>
              <p className="text-slate-500 text-xs mt-1">Upload 1 or up to 4 photos to guide the style & character identity</p>
            </div>
          )}
          
          <input
            type="file"
            multiple
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Presets and Custom Mode Slider */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-300">Select Cel Animation Preset</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PRESETS.map((preset) => {
              const IconComp = preset.icon;
              const isSelected = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => setActivePreset(preset.id)}
                  className={`p-4 rounded-xl border text-left transition-all relative ${
                    isSelected 
                      ? 'border-purple-500 bg-purple-950/20 text-purple-200 ring-1 ring-purple-500' 
                      : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-purple-500/15 text-purple-400' : 'bg-slate-800 text-slate-500'}`}>
                      <IconComp className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-slate-100">{preset.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{preset.description}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Background Isolation Toggle */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/20 space-y-3">
          <div className="space-y-0.5">
            <label className="block text-sm font-semibold text-slate-200">
              Background Options / خيارات الخلفية
            </label>
            <p className="text-xs text-slate-400">
              Choose to preserve and style original backgrounds or isolate the character completely.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setKeepBackground(true)}
              className={`py-3 px-4 rounded-xl border font-medium text-xs transition-all flex flex-col items-center justify-center gap-1.5 ${
                keepBackground
                  ? 'border-purple-500 bg-purple-950/25 text-purple-200 shadow-md ring-1 ring-purple-500'
                  : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <Paintbrush className="h-4 w-4 text-purple-400" />
              <span>Use Original Background</span>
              <span className="text-[10px] text-slate-400 font-normal">استخدام الخلفية الأصلية</span>
            </button>
            <button
              type="button"
              onClick={() => setKeepBackground(false)}
              className={`py-3 px-4 rounded-xl border font-medium text-xs transition-all flex flex-col items-center justify-center gap-1.5 ${
                !keepBackground
                  ? 'border-purple-500 bg-purple-950/25 text-purple-200 shadow-md ring-1 ring-purple-500'
                  : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <span className="text-lg leading-none">🙄</span>
              <span>No Background (Isolated)</span>
              <span className="text-[10px] text-slate-400 font-normal">تصميم بدون خلفية</span>
            </button>
          </div>
        </div>

        {/* Dynamic fields for custom templates */}
        {activePreset === 'custom_template' && (
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 gap-4 grid grid-cols-1 sm:grid-cols-2 animate-fade-in">
            <div className="col-span-1 sm:col-span-2 flex items-center gap-1.5 text-xs text-purple-400 font-medium">
              <Info className="h-3.5 w-3.5" />
              Customize variables to craft unique hand-painted environments!
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Subject</label>
              <input
                type="text"
                placeholder="e.g. A pilot wearing a vintage headset"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-100 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Place / Background</label>
              <input
                type="text"
                placeholder="e.g. A retro sci-fi space station"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-100 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Primary Color</label>
              <input
                type="text"
                placeholder="e.g. pastel teal"
                value={color1}
                onChange={(e) => setColor1(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-100 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Accent Color</label>
              <input
                type="text"
                placeholder="e.g. warm peach"
                value={color2}
                onChange={(e) => setColor2(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-100 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        )}

        {/* Dynamic fields for vintage_ink_paint */}
        {activePreset === 'vintage_ink_paint' && (
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 gap-4 grid grid-cols-1 sm:grid-cols-2 animate-fade-in">
            <div className="col-span-1 sm:col-span-2 flex items-center gap-1.5 text-xs text-purple-400 font-medium pb-1.5 border-b border-slate-800/60">
              <Paintbrush className="h-4 w-4" />
              Tune traditional hand-inked details tailored to your photo(s)!
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Subject Description / Focus</label>
              <input
                type="text"
                placeholder="e.g. a close-up portrait of a man with sunglasses"
                value={vSubject}
                onChange={(e) => setVSubject(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-100 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Muted Flat Colors</label>
              <input
                type="text"
                placeholder="e.g. soft, muted, hand-painted flat colors, like a muted navy blue shirt"
                value={vColors}
                onChange={(e) => setVColors(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-100 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Key Accessories (Preserved)</label>
              <input
                type="text"
                placeholder="e.g. sunglasses"
                value={vAccessories}
                onChange={(e) => setVAccessories(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-100 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Specific Patterns (Preserved)</label>
              <input
                type="text"
                placeholder="e.g. specific shirt pattern"
                value={vPatterns}
                onChange={(e) => setVPatterns(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-100 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Hand-Painted Background Representation</label>
              <input
                type="text"
                placeholder="e.g. a classic European street with cafes"
                value={vBackground}
                onChange={(e) => setVBackground(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-100 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        )}

        {/* Prompt Preview Banner */}
        <div className="bg-slate-900/20 border border-slate-850 p-3.5 rounded-xl flex gap-3 text-xs leading-relaxed text-slate-400">
          <Sparkles className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-300">Active Prompt Formula:</span>{' '}
            {activePreset === 'custom_template' ? (
              <span>
                Retro cel animation style, a <span className="text-purple-300 font-medium">"{subject || '[Subject]'}"</span> in{' '}
                <span className="text-purple-305 font-medium">"{place || '[Place]'}"</span>, hand-painted background, visible cel lines, muted{' '}
                <span className="text-purple-300 font-medium">"{color1}"</span> and{' '}
                <span className="text-purple-300 font-medium">"{color2}"</span> palette...
                {keepBackground ? ' [Preserving original background]' : ' [Isolated: No Background]'}
              </span>
            ) : activePreset === 'vintage_ink_paint' ? (
              <span>
                A pure vintage, hand-drawn retro cel animation keyframe... focused on{' '}
                <span className="text-purple-300 font-medium">"{vSubject}"</span> with{' '}
                <span className="text-purple-300 font-medium">"{vColors}"</span>. Preserving key{' '}
                <span className="text-purple-300 font-medium">"{vAccessories}"</span> and{' '}
                <span className="text-purple-300 font-medium">"{vPatterns}"</span> {keepBackground ? `against styled background "${vBackground}"` : 'without any background (pure isolated subject)'} on a seamless soft glow field.
              </span>
            ) : (
              <span>
                {PRESETS.find(p => p.id === activePreset)?.promptPreview}
                {keepBackground ? ' [Preserving original background]' : ' [Isolated: No Background]'}
              </span>
            )}
          </div>
        </div>

        {error && <p className="text-red-400 text-center text-sm bg-red-950/40 p-3 rounded-xl border border-red-900/40">{error}</p>}

        {/* Command Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={images.length === 0 || isLoading || isRateLimited}
            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-purple-950/20"
          >
            {isRateLimited ? (
              <span>Rate Limited (Wait 1m)</span>
            ) : isLoading ? (
              <>
                <RefreshCw className="animate-spin h-5 w-5" />
                <span>Converting to Cel Animation...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                <span>Create Cel Masterpiece</span>
              </>
            )}
          </button>
          
          <button
            onClick={handleClear}
            className="p-3.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 disabled:bg-slate-900/40 disabled:text-slate-600 transition-colors focus:outline-none"
            aria-label="Clear inputs"
            disabled={isLoading || images.length === 0}
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>

        {/* Generated Result Display */}
        {resultImageUrl && (
          <div className="mt-6 space-y-3 animate-fade-in">
            <h3 className="text-sm font-semibold text-slate-300">Generated Cel Masterpiece</h3>
            
            {/* The Cinematic Retro Frame */}
            <div className="relative flex justify-center bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden group">
              
              {/* Scanlines / Retro screen layer */}
              <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-20"></div>

              {/* Cafe (TV Presets) Layout Overlay */}
              {activePreset === 'book_cafe' && keepBackground && (
                <div className="absolute inset-0 border-[16px] border-amber-950/90 rounded-2xl pointer-events-none z-10 shadow-[inner_0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-center">
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-mono tracking-widest text-amber-500/40 select-none uppercase">DYNAMIC TV CH.08</div>
                </div>
              )}

              {/* Village (Film Strip) Layout Overlay */}
              {activePreset === 'village_low_angle' && keepBackground && (
                <div className="absolute inset-x-0 top-0 bottom-0 bg-black pointer-events-none z-10 border-y-12 border-slate-900 flex flex-row justify-between items-center px-2">
                  <div className="h-full flex flex-col justify-around py-2">
                    {[1,2,3,4,5].map(n => <div key={n} className="w-4 h-5 bg-slate-850 rounded-sm"></div>)}
                  </div>
                  <div className="h-full flex flex-col justify-around py-2">
                    {[1,2,3,4,5].map(n => <div key={n} className="w-4 h-5 bg-slate-850 rounded-sm"></div>)}
                  </div>
                </div>
              )}

              {/* Vintage Hand-Inked & Painted Animation Keyframe Overlay */}
              {activePreset === 'vintage_ink_paint' && keepBackground && (
                <div className="absolute inset-0 border-8 border-slate-900 rounded-2xl pointer-events-none z-10 shadow-[inner_0_0_15px_rgba(0,0,0,0.6)] flex items-end justify-between p-3 select-none">
                  <div className="text-[9px] font-mono tracking-widest text-slate-500 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">C-12 OUT/PAINT</div>
                  <div className="text-[9px] font-mono tracking-widest text-slate-500 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">1988 ACME-REG</div>
                </div>
              )}

              {/* Image Preview Container */}
              <div className="max-w-md w-full aspect-square rounded-lg bg-black flex items-center justify-center overflow-hidden border border-slate-800">
                <img src={resultImageUrl} alt="Generated Cel" className="max-h-full max-w-full object-contain" />
              </div>

              {/* Action Ribbon below result */}
              <div className="absolute bottom-2 right-2 flex gap-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <a
                  href={resultImageUrl}
                  download="retro-cel-animation.png"
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow transition-all flex items-center gap-1"
                >
                  Download PNG
                </a>
              </div>
            </div>
            
            <p className="text-xs text-center text-slate-500 italic">
              Pro tip: You can save this masterpiece right-click / drag, or add it directly to your character library.
            </p>
          </div>
        )}
      </div>
    </FeatureCard>
  );
};

export default RetroCelAnimation;
