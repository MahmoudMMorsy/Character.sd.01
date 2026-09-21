import React, { useState, useRef, useEffect } from 'react';
import type { FeatureTab } from '../types';
import { Search, Sparkles, Image, Palette, Box, Film, SlidersHorizontal } from 'lucide-react';

export interface TabItem {
  id: FeatureTab;
  label: string;
  icon: React.FC<{ className?: string }>;
  category: 'ai' | 'pixel' | 'editing' | '3d' | 'animation';
  description?: string;
  component?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: FeatureTab;
  setActiveTab: (tab: FeatureTab) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeCategory: string;
  setActiveCategory: (category: string) => void;
}

export const CATEGORIES = [
  { id: 'all', label: 'الكل', icon: Sparkles },
  { id: 'ai', label: 'ذكاء اصطناعي', icon: Image },
  { id: 'pixel', label: 'بيكسل ورسومات', icon: Palette },
  { id: 'editing', label: 'تعديل احترافي', icon: SlidersHorizontal },
  { id: '3d', label: '3D وتركيب', icon: Box },
  { id: 'animation', label: 'حرِكة وأنيميشن', icon: Film },
];

const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  activeCategory,
  setActiveCategory
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeElement = document.getElementById(`tab-${activeTab}`);
      if (activeElement) {
        const container = scrollContainerRef.current;
        const scrollLeft = activeElement.offsetLeft - (container.clientWidth / 2) + (activeElement.clientWidth / 2);
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }, [activeTab]);

  const filteredTabs = tabs.filter(tab => {
    const matchesCategory = activeCategory === 'all' || tab.category === activeCategory;
    const matchesSearch = tab.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tab.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-full space-y-3 px-3 pt-2 pb-1">

      {/* Category Pills & Search Bar Row */}
      <div className="flex flex-col gap-2.5">
        {/* Search Input Bar */}
        <div className="relative w-full">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث عن أداة التصميم المحددة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#131b2e] border border-white/10 rounded-2xl py-2.5 pr-10 pl-4 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-violet-500 transition-all text-right dir-rtl shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white bg-white/10 rounded-full w-5 h-5 flex items-center justify-center"
            >
              ✕
            </button>
          )}
        </div>

        {/* Categories Horizontal Scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-right dir-rtl">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap android-touch ${
                  isSelected
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/40 border border-violet-400/30'
                    : 'bg-[#182238] text-slate-300 hover:bg-[#202d4a] border border-white/5'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tool Selector Horizontal Scroll Grid */}
      <div 
        ref={scrollContainerRef}
        className="flex space-x-2 space-x-reverse overflow-x-auto no-scrollbar py-1 snap-x dir-rtl"
        role="tablist"
      >
        {filteredTabs.length > 0 ? (
          filteredTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all duration-200 snap-center android-touch border
                  ${isActive
                    ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white border-violet-400/50 shadow-md shadow-violet-900/50 scale-[1.02]'
                    : 'bg-[#131b2e] text-slate-300 hover:bg-[#182238] border-white/5'
                  }
                `}
                role="tab"
                aria-selected={isActive}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-violet-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })
        ) : (
          <div className="w-full py-2 text-center text-xs text-slate-400">
            لم يتم العثور على أداة تنطبق عليها البحث
          </div>
        )}
      </div>

    </div>
  );
};

export default Tabs;
