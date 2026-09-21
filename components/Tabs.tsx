
import React, { useRef, useEffect } from 'react';
import type { FeatureTab } from '../types';

interface TabItem {
  id: FeatureTab;
  label: string;
  icon: React.FC<{ className?: string }>;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: FeatureTab;
  setActiveTab: (tab: FeatureTab) => void;
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, setActiveTab }) => {
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

  return (
    <div className="w-full">
      <div 
        ref={scrollContainerRef}
        className="flex space-x-1 overflow-x-auto no-scrollbar px-2 sm:px-4 py-2 snap-x"
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center space-x-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 snap-center
                ${isActive 
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30' 
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-white'
                }
              `}
              role="tab"
              aria-selected={isActive}
            >
              <tab.icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Tabs;
