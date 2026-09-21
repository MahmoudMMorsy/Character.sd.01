
export interface ImageFile {
  file: File;
  previewUrl: string;
  base64?: string;
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export interface VideoFile {
  file: File;
  previewUrl: string;
}

export type FeatureTab = string;

export interface HistoryItem {
  id: string;
  timestamp: number;
  resultImage?: string; // Keep for backward compatibility/single image results
  resultImages?: string[]; // New: For multi-layer results (Body, Hair, Cloth)
  resultVideo?: string; // New: For video results
  tabId: FeatureTab;
  tabLabel: string;
  inputs: {
    // Can store various input types, like preview URLs or text prompts
    [key: string]: any;
  };
}
