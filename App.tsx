import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Tabs, { TabItem } from './components/Tabs';
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
import { Tv as TvIcon, Home, Grid, History as HistoryIcon, Sparkles, X, Smartphone, Layers } from 'lucide-react';

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

const TABS: TabItem[] = [
  { id: 'retro-cel', label: 'Retro Cel', category: 'animation', icon: TvIcon, component: <RetroCelAnimation /> },
  { id: '10-variations', label: '10 Ideas', category: 'ai', icon: MagicWandIcon, component: <DesignVariations /> },
  { id: 'aggressive-pixel-sprite', label: 'Pixel Boss', category: 'pixel', icon: SpriteIcon, component: <AggressivePixelSprite /> },
  { id: 'retro-pixel-sprite', label: 'Retro Pixel', category: 'pixel', icon: SpriteIcon, component: <RetroPixelSprite /> },
  { id: 'grid-splitter', label: 'Grid Split', category: 'editing', icon: LayersSplitIcon, component: <GridSplitter /> },
  { id: 'layer-composer', label: 'Composer', category: '3d', icon: LayersSplitIcon, component: <LayerComposer /> },
  { id: 'make-realistic', label: 'Realistic', category: 'editing', icon: CameraIcon, component: <MakeRealistic /> },
  { id: 'adult-to-child', label: 'Adult -> Child', category: 'editing', icon: UserIcon, component: <AdultToChild /> },
  { id: 'mannequin-head', label: 'Mannequin', category: '3d', icon: UserIcon, component: <MannequinHeadConverter /> },
  { id: 'char-kit', label: 'Asset Kit', category: '3d', icon: LayersSplitIcon, component: <CharacterKitGenerator /> },
  { id: 'in-place-video', label: 'In-Place Video', category: 'animation', icon: AnimationIcon, component: <InPlaceVideoMaker /> },
  { id: 'sprite-to-gif', label: 'Sprite to GIF', category: 'animation', icon: GifIcon, component: <SpriteToGifConverter addToHistory={() => {}} /> },
  { id: 'in-place-anim', label: 'In-Place Anim', category: 'animation', icon: AnimationIcon, component: <InPlaceAnimationMaker /> },
  { id: 'expressions', label: '36 Faces', category: 'editing', icon: FaceSmileIcon, component: <ExpressionSheetMaker /> },
  { id: 'street-fashion', label: 'Street OOTD', category: 'ai', icon: CameraIcon, component: <StreetFashion /> },
  { id: 'ghost', label: 'Ghost Product', category: 'editing', icon: HangerIcon, component: <GhostMannequin /> },
  { id: 'decompose', label: '3D Split', category: '3d', icon: LayersSplitIcon, component: <CharacterDecomposer /> },
  { id: 'sprite-sheet', label: 'Sprite Sheet', category: 'pixel', icon: SpriteIcon, component: <SpriteSheetMaker /> },
  { id: 'restore', label: 'Old Photo', category: 'editing', icon: RestoreIcon, component: <PhotoRestoration /> },
  { id: 'gif-builder', label: 'GIF Maker', category: 'animation', icon: GifIcon, component: <GifBuilder /> },
  { id: 'text-to-image', label: 'Art Gen', category: 'ai', icon: ImageIcon, component: <TextToImage /> },
  { id: 'remix', label: 'Remix', category: 'ai', icon: MagicWandIcon, component: <Remix /> },
  { id: 'remove-bg', label: 'Remove BG', category: 'editing', icon: EraserIcon, component: <RemoveBackground /> },
  { id: 'face-swap', label: 'Face Swap', category: 'editing', icon: SwapIcon, component: <FaceSwap /> },
  { id: 'color-changer', label: 'Recolor', category: 'editing', icon: PaletteIcon, component: <ColorChanger /> },
  { id: 'try-on', label: 'Try-On', category: 'ai', icon: ShirtIcon, component: <VirtualTryOn /> },
  { id: 'clothes-only', label: 'Isolate', category: 'editing', icon: ShirtIcon, component: <ClothesOnly /> },
  { id: 'banana-animate', label: 'Animate', category: 'animation', icon: SparklesIcon, component: <BananaAnimated /> },
  { id: 'layering', label: 'Layers', category: '3d', icon: LayeringIcon, component: <Layering /> },
  { id: 'outfit-builder', label: 'Builder', category: 'editing', icon: OutfitBuilderIcon, component: <OutfitBuilder /> },
  { id: 'ethnicity-changer', label: 'Ethnicity', category: 'editing', icon: UserIcon, component: <EthnicityChanger /> },
  { id: 'realistic-anatomy', label: 'Anatomy', category: 'editing', icon: UserIcon, component: <RealisticAnatomy /> },
  { id: 't-pose', label: 'T-Pose', category: '3d', icon: TPoseIcon, component: <TPoseConverter /> },
  { id: '3d-model', label: '3D Map', category: '3d', icon: Model3DIcon, component: <Model3DConverter /> },
];

const LOCAL_STORAGE_HISTORY_KEY = 'ai_remix_history';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FeatureTab>(TABS[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeBottomNav, setActiveBottomNav] = useState<'home' | 'tools' | 'history'>('home');
  const [isToolsGridOpen, setIsToolsGridOpen] = useState(false);

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
    <div className="bg-[#090d16] text-slate-100 min-h-screen font-sans flex flex-col selection:bg-violet-500 selection:text-white pb-24">
      
      {/* Offline / Local Mode Banner */}
      {effectiveLocalMode && showBanner && (
        <div className="bg-emerald-950/90 backdrop-blur-md text-emerald-200 text-center text-xs py-2 px-4 font-semibold shadow-lg sticky top-0 z-50 flex justify-between items-center border-b border-emerald-500/20">
          <div className="flex items-center gap-2">
             <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]"></span>
             <span className="truncate">{isOffline ? "وضع أوفلاين: محرك TinyEngine™ الذكي يعمل أوفلاين" : "الوضع المحلي: تجربة افتراضية سريعة"}</span>
          </div>
          <button onClick={() => setShowBanner(false)} className="p-1 hover:bg-emerald-900 rounded text-white/80">✕</button>
        </div>
      )}
      
      {/* Header Bar */}
      <Header isLocalMode={forceLocalMode} onToggleMode={toggleLocalMode} />
      
      {/* Navigation & Search Selector Bar */}
      <div className="sticky top-[61px] z-40 bg-[#090d16]/90 backdrop-blur-xl border-b border-white/5 shadow-2xl">
         <Tabs
            tabs={TABS}
            activeTab={activeTab}
            setActiveTab={(id) => {
                setActiveTab(id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
          />
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-grow w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 p-3 sm:p-4">

        {/* Main Canvas Component Container */}
        <main className="flex-1 w-full max-w-3xl mx-auto lg:mx-0">
            {activeComponent && activeTabInfo && (
                <div className="animate-fade-in android-card p-4 sm:p-6 border border-white/10 shadow-2xl">
                    {React.cloneElement(activeComponent as React.ReactElement<any>, {
                        addToHistory: (itemData: Omit<HistoryItem, 'id' | 'timestamp' | 'tabId' | 'tabLabel'>) => addToHistory(itemData, activeTabInfo)
                    })}
                </div>
            )}
        </main>

        {/* Desktop History Sidebar */}
        <div className="hidden lg:block w-96 flex-shrink-0">
             <div className="sticky top-28 android-card p-4 border border-white/10">
                <HistoryPanel 
                    history={history} 
                    onClear={clearHistory} 
                    onDeleteItem={deleteHistoryItem} 
                    isMobileView={false} 
                />
             </div>
        </div>
      </div>

      {/* Floating Bottom Android Navigation Bar */}
      <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-[#131b2e]/95 backdrop-blur-2xl border border-white/10 rounded-full px-4 py-2 shadow-2xl shadow-black/80 flex justify-around items-center">
        <button
          onClick={() => {
            setActiveBottomNav('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all android-touch ${
            activeBottomNav === 'home' ? 'text-violet-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">الرئيسية</span>
        </button>

        <button
          onClick={() => {
            setActiveBottomNav('tools');
            setIsToolsGridOpen(true);
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all android-touch ${
            activeBottomNav === 'tools' ? 'text-violet-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Grid className="w-5 h-5" />
          <span className="text-[10px]">الأدوات (34+)</span>
        </button>

        <button
          onClick={() => {
            setActiveBottomNav('history');
            setIsHistoryOpen(true);
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all relative android-touch ${
            activeBottomNav === 'history' ? 'text-violet-400 font-bold' : 'text-slate-400'
          }`}
        >
          <HistoryIcon className="w-5 h-5" />
          <span className="text-[10px]">السجل</span>
          {history.length > 0 && (
            <span className="absolute -top-1 right-2 bg-pink-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
              {history.length}
            </span>
          )}
        </button>
      </nav>

      {/* Android Tools Full Sheet Modal */}
      {isToolsGridOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end animate-fade-in">
          <div className="bg-[#131b2e] border-t border-white/10 rounded-t-3xl max-h-[85vh] flex flex-col p-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-400" />
                <h3 className="text-base font-bold text-white">جميع أدوات التصميم ({TABS.length})</h3>
              </div>
              <button
                onClick={() => {
                  setIsToolsGridOpen(false);
                  setActiveBottomNav('home');
                }}
                className="p-1.5 rounded-full bg-white/10 text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 py-4 overflow-y-auto no-scrollbar dir-rtl">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsToolsGridOpen(false);
                      setActiveBottomNav('home');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`flex items-center gap-3 p-3 rounded-2xl border text-right transition-all android-touch ${
                      isSelected
                        ? 'bg-violet-600/30 border-violet-500 text-white shadow-lg shadow-violet-900/30'
                        : 'bg-[#182238] border-white/5 text-slate-300 hover:bg-[#202d4a]'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-violet-500/20 text-violet-300">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* History Modal Drawer */}
      {isHistoryOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md" onClick={() => { setIsHistoryOpen(false); setActiveBottomNav('home'); }}>
              <div 
                className="bg-[#131b2e] border border-white/10 w-full sm:w-[500px] h-[85vh] sm:h-[80vh] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                  <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#090d16]">
                      <h2 className="text-base font-bold text-white flex items-center gap-2 dir-rtl">
                        <span className="text-violet-400">سجل ابتكارات التصميم</span>
                        <span className="bg-white/10 text-xs py-0.5 px-2 rounded-full text-slate-300">{history.length}</span>
                      </h2>
                      <button onClick={() => { setIsHistoryOpen(false); setActiveBottomNav('home'); }} className="p-2 text-slate-400 hover:text-white bg-white/5 rounded-full">
                        <X className="h-5 w-5" />
                      </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
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
