
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Tabs from './components/Tabs';
import VirtualTryOn from './components/VirtualTryOn';
import ClothesOnly from './components/ClothesOnly';
import FaceSwap from './components/FaceSwap';
import ColorChanger from './components/ColorChanger';
import Remix from './components/Remix';
import EthnicityChanger from './components/EthnicityChanger';
import RealisticAnatomy from './components/RealisticAnatomy';
import TPoseConverter from './components/TPoseConverter';
import Layering from './components/Layering';
import Model3DConverter from './components/Model3DConverter';
import OutfitBuilder from './components/OutfitBuilder';
import BananaAnimated from './components/BananaAnimated';
import TextToImage from './components/TextToImage';
import RemoveBackground from './components/RemoveBackground';
import CharacterDecomposer from './components/CharacterDecomposer';
import GifBuilder from './components/GifBuilder';
import GhostMannequin from './components/GhostMannequin';
import PhotoRestoration from './components/PhotoRestoration';
import StreetFashion from './components/StreetFashion';
import SpriteSheetMaker from './components/SpriteSheetMaker';
import SpriteToGifConverter from './components/SpriteToGifConverter';
import InPlaceAnimationMaker from './components/InPlaceAnimationMaker';
import InPlaceVideoMaker from './components/InPlaceVideoMaker';
import ExpressionSheetMaker from './components/ExpressionSheetMaker';
import HistoryPanel from './components/HistoryPanel';
import CharacterKitGenerator from './components/CharacterKitGenerator';
import DesignVariations from './components/DesignVariations';
import MakeRealistic from './components/MakeRealistic';
import AdultToChild from './components/AdultToChild';
import MannequinHeadConverter from './components/MannequinHeadConverter';
import AggressivePixelSprite from './components/AggressivePixelSprite';
import RetroPixelSprite from './components/RetroPixelSprite';
import BatchProcessor from './components/BatchProcessor';
import GridSplitter from './components/GridSplitter';
import LayerComposer from './components/LayerComposer';
import RetroCelAnimation from './components/RetroCelAnimation';
import { setUseLocalEngine } from './services/geminiService';
import { 
  auth, 
  saveHistoryItemToFirestore, 
  loadHistoryFromFirestore, 
  deleteHistoryItemFromFirestore 
} from './services/firebase';
import { Tv as TvIcon, Layers as LayersIcon } from 'lucide-react';

import type { FeatureTab, HistoryItem } from './types';
import { MagicWandIcon } from './components/icons/MagicWandIcon';
import { SwapIcon } from './components/icons/SwapIcon';
import { ShirtIcon } from './components/icons/ShirtIcon';
import { PaletteIcon } from './components/icons/PaletteIcon';
import { UserIcon } from './components/icons/UserIcon';
import { TPoseIcon } from './components/icons/TPoseIcon';
import { LayeringIcon } from './components/icons/LayeringIcon';
import { Model3DIcon } from './components/icons/Model3DIcon';
import { OutfitBuilderIcon } from './components/icons/OutfitBuilderIcon';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { ImageIcon } from './components/icons/ImageIcon';
import { EraserIcon } from './components/icons/EraserIcon';
import { LayersSplitIcon } from './components/icons/LayersSplitIcon';
import { GifIcon } from './components/icons/GifIcon';
import { HangerIcon } from './components/icons/HangerIcon';
import { RestoreIcon } from './components/icons/RestoreIcon';
import { CameraIcon } from './components/icons/CameraIcon';
import { SpriteIcon } from './components/icons/SpriteIcon';
import { AnimationIcon } from './components/icons/AnimationIcon';
import { FaceSmileIcon } from './components/icons/FaceSmileIcon';

const TABS = [
  { id: 'retro-cel', label: 'Retro Cel', icon: TvIcon, component: <RetroCelAnimation /> },
  { id: '10-variations', label: '10 Ideas', icon: MagicWandIcon, component: <DesignVariations /> },
  { id: 'batch-processor', label: 'Batch Pixel', icon: LayersIcon, component: <BatchProcessor /> },
  { id: 'aggressive-pixel-sprite', label: 'Pixel Boss', icon: SpriteIcon, component: <AggressivePixelSprite /> },
  { id: 'retro-pixel-sprite', label: 'Retro Pixel', icon: SpriteIcon, component: <RetroPixelSprite /> },
  { id: 'grid-splitter', label: 'Grid Split', icon: LayersSplitIcon, component: <GridSplitter /> },
  { id: 'layer-composer', label: 'Composer', icon: LayersSplitIcon, component: <LayerComposer /> },
  { id: 'make-realistic', label: 'Realistic', icon: CameraIcon, component: <MakeRealistic /> },
  { id: 'adult-to-child', label: 'Adult -> Child', icon: UserIcon, component: <AdultToChild /> },
  { id: 'mannequin-head', label: 'Mannequin', icon: UserIcon, component: <MannequinHeadConverter /> },
  { id: 'char-kit', label: 'Asset Kit', icon: LayersSplitIcon, component: <CharacterKitGenerator /> },
  { id: 'in-place-video', label: 'In-Place Video', icon: AnimationIcon, component: <InPlaceVideoMaker /> },
  { id: 'sprite-to-gif', label: 'Sprite to GIF', icon: GifIcon, component: <SpriteToGifConverter addToHistory={() => {}} /> },
  { id: 'in-place-anim', label: 'In-Place Anim', icon: AnimationIcon, component: <InPlaceAnimationMaker /> },
  { id: 'expressions', label: '36 Faces', icon: FaceSmileIcon, component: <ExpressionSheetMaker /> },
  { id: 'street-fashion', label: 'Street OOTD', icon: CameraIcon, component: <StreetFashion /> },
  { id: 'ghost', label: 'Ghost Product', icon: HangerIcon, component: <GhostMannequin /> },
  { id: 'decompose', label: '3D Split', icon: LayersSplitIcon, component: <CharacterDecomposer /> },
  { id: 'sprite-sheet', label: 'Sprite Sheet', icon: SpriteIcon, component: <SpriteSheetMaker /> },
  { id: 'restore', label: 'Old Photo', icon: RestoreIcon, component: <PhotoRestoration /> },
  { id: 'gif-builder', label: 'GIF Maker', icon: GifIcon, component: <GifBuilder /> },
  { id: 'text-to-image', label: 'Art Gen', icon: ImageIcon, component: <TextToImage /> },
  { id: 'remix', label: 'Remix', icon: MagicWandIcon, component: <Remix /> },
  { id: 'remove-bg', label: 'Remove BG', icon: EraserIcon, component: <RemoveBackground /> },
  { id: 'face-swap', label: 'Face Swap', icon: SwapIcon, component: <FaceSwap /> },
  { id: 'color-changer', label: 'Recolor', icon: PaletteIcon, component: <ColorChanger /> },
  { id: 'try-on', label: 'Try-On', icon: ShirtIcon, component: <VirtualTryOn /> },
  { id: 'clothes-only', label: 'Isolate', icon: ShirtIcon, component: <ClothesOnly /> },
  { id: 'banana-animate', label: 'Animate', icon: SparklesIcon, component: <BananaAnimated /> },
  { id: 'layering', label: 'Layers', icon: LayeringIcon, component: <Layering /> },
  { id: 'outfit-builder', label: 'Builder', icon: OutfitBuilderIcon, component: <OutfitBuilder /> },
  { id: 'ethnicity-changer', label: 'Ethnicity', icon: UserIcon, component: <EthnicityChanger /> },
  { id: 'realistic-anatomy', label: 'Anatomy', icon: UserIcon, component: <RealisticAnatomy /> },
  { id: 't-pose', label: 'T-Pose', icon: TPoseIcon, component: <TPoseConverter /> },
  { id: '3d-model', label: '3D Map', icon: Model3DIcon, component: <Model3DConverter /> },
];

const LOCAL_STORAGE_HISTORY_KEY = 'ai_remix_history';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FeatureTab>(TABS[0].id);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [forceLocalMode, setForceLocalMode] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Sync with local storage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn("Could not save history to localStorage", e);
    }
  }, [history]);

  // Sync with Firestore on user login
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        try {
          const cloudItems = await loadHistoryFromFirestore(currentUser.uid);
          if (cloudItems.length > 0) {
            setHistory(prev => {
              const existingIds = new Set(prev.map(item => item.id));
              const newItems = cloudItems.filter(item => !existingIds.has(item.id));
              return [...newItems, ...prev].sort((a, b) => b.timestamp - a.timestamp);
            });
          }
        } catch (e) {
          console.warn("Could not load cloud history:", e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleLocalMode = (isLocal: boolean) => {
      setForceLocalMode(isLocal);
      setUseLocalEngine(isLocal);
  };

  const activeTabInfo = TABS.find(tab => tab.id === activeTab);
  const activeComponent = activeTabInfo?.component;

  const addToHistory = (
    itemData: Omit<HistoryItem, 'id' | 'timestamp' | 'tabId' | 'tabLabel'>,
    tabInfo: { id: FeatureTab, label: string }
  ) => {
    const newHistoryItem: HistoryItem = {
      ...itemData,
      id: `history-${Date.now()}`,
      timestamp: Date.now(),
      tabId: tabInfo.id,
      tabLabel: tabInfo.label,
    };
    setHistory(prev => [newHistoryItem, ...prev]);

    // Asynchronously save to Firestore if user is authenticated and online
    const currentUser = auth.currentUser;
    if (currentUser && navigator.onLine) {
      saveHistoryItemToFirestore(currentUser.uid, newHistoryItem);
    }
  };

  const clearHistory = () => {
    const currentUser = auth.currentUser;
    if (currentUser && navigator.onLine) {
      history.forEach(item => deleteHistoryItemFromFirestore(currentUser.uid, item.id));
    }
    setHistory([]);
    try {
      localStorage.removeItem(LOCAL_STORAGE_HISTORY_KEY);
    } catch {}
  };

  const deleteHistoryItem = (id: string) => {
    const currentUser = auth.currentUser;
    if (currentUser && navigator.onLine) {
      deleteHistoryItemFromFirestore(currentUser.uid, id);
    }
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const effectiveLocalMode = isOffline || forceLocalMode;

  return (
    <div className="bg-[#0f172a] text-slate-200 min-h-screen font-sans flex flex-col selection:bg-purple-500 selection:text-white pb-[max(5rem,env(safe-area-inset-bottom))] sm:pb-[env(safe-area-inset-bottom)]">
      
      {/* Offline Banner */}
      {effectiveLocalMode && showBanner && (
        <div className="bg-emerald-900/90 backdrop-blur-md text-emerald-100 text-center text-xs py-2 px-4 font-semibold shadow-lg sticky top-0 z-50 flex justify-between items-center border-b border-emerald-700">
          <div className="flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
             <span className="truncate">{isOffline ? "OFFLINE: Running on TinyEngine™ Local AI" : "LOCAL MODE: Simulating Offline Experience"}</span>
          </div>
          <button onClick={() => setShowBanner(false)} className="p-1 hover:bg-emerald-800 rounded text-white/80">✕</button>
        </div>
      )}
      
      <Header isLocalMode={forceLocalMode} onToggleMode={toggleLocalMode} />
      
      {/* Sticky Tabs */}
      <div className="sticky top-0 z-40 bg-[#0f172a]/95 backdrop-blur border-b border-gray-800 shadow-lg">
         <Tabs
            tabs={TABS.map(({ id, label, icon }) => ({ id, label, icon }))}
            activeTab={activeTab}
            setActiveTab={(id) => {
                setActiveTab(id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
      </div>

      <div className="flex-grow w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 p-4">
        <main className="flex-1 w-full max-w-3xl mx-auto lg:mx-0">
            {activeComponent && activeTabInfo && (
                <div className="animate-fade-in px-2 sm:px-0 pb-24 sm:pb-0">
                    {React.cloneElement(activeComponent, {
                        addToHistory: (itemData: Omit<HistoryItem, 'id' | 'timestamp' | 'tabId' | 'tabLabel'>) => addToHistory(itemData, activeTabInfo)
                    })}
                </div>
            )}
        </main>

        {/* Desktop History Sidebar (Visible only on Large screens) */}
        <div className="hidden lg:block w-96 flex-shrink-0">
             <div className="sticky top-24">
                <HistoryPanel 
                    history={history} 
                    onClear={clearHistory} 
                    onDeleteItem={deleteHistoryItem} 
                    isMobileView={false} 
                />
             </div>
        </div>
      </div>

      {/* Floating Action Button for History (Mobile/Tablet only) */}
      <button 
        onClick={() => setIsHistoryOpen(true)}
        className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-6 w-14 h-14 bg-gradient-to-tr from-purple-600 to-pink-600 rounded-full shadow-2xl shadow-purple-900/50 flex items-center justify-center text-white z-40 lg:hidden active:scale-90 transition-transform"
        aria-label="Open History"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
             <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {history.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#0f172a]">
                {history.length}
            </span>
        )}
      </button>

      {/* History Drawer/Modal */}
      {isHistoryOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setIsHistoryOpen(false)}>
              <div 
                className="bg-[#1e293b] w-full sm:w-[500px] h-[85vh] sm:h-[80vh] rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl animate-slide-up overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                  <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-[#0f172a]">
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="text-purple-400">Recent Creations</span>
                        <span className="bg-gray-800 text-xs py-0.5 px-2 rounded-full text-gray-400">{history.length}</span>
                      </h2>
                      <button onClick={() => setIsHistoryOpen(false)} className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-0">
                     <HistoryPanel 
                        history={history} 
                        onClear={clearHistory} 
                        onDeleteItem={deleteHistoryItem} 
                        isMobileView={true} 
                     />
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;
