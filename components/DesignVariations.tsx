import React, { useState } from 'react';
import ImageUploader from './ImageUploader';
import { generateVariationPrompts, generateVariationImage, fileToGenerativePart } from '../services/geminiService';
import type { ImageFile } from '../types';
import JSZip from 'jszip';

interface DesignVariationsProps {
  addToHistory?: (item: any) => void;
}

const DesignVariations: React.FC<DesignVariationsProps> = ({ addToHistory }) => {
  const [image, setImage] = useState<ImageFile | null>(null);
  
  const [prompts, setPrompts] = useState<string[]>([]);
  const [results, setResults] = useState<Record<number, string>>({});
  const [generationErrors, setGenerationErrors] = useState<Record<number, string>>({});
  
  const [loading, setLoading] = useState(false);
  const [retryingIndex, setRetryingIndex] = useState<number | null>(null);
  const [progressText, setProgressText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const retrySingleVariation = async (idx: number) => {
    if (!image || !prompts[idx] || loading || retryingIndex !== null) return;
    setRetryingIndex(idx);
    setError(null);
    setGenerationErrors(prev => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });

    try {
      const filePart = await fileToGenerativePart(image.file);
      const generatedImage = await generateVariationImage(filePart, prompts[idx]);
      setResults(prev => ({ ...prev, [idx]: generatedImage }));
    } catch (err: any) {
      console.error(`Retry failed for variation ${idx + 1}:`, err);
      const errMsg = err?.message || "Retry failed";
      setGenerationErrors(prev => ({ ...prev, [idx]: errMsg }));
      setResults(prev => ({ ...prev, [idx]: "ERROR" }));
    } finally {
      setRetryingIndex(null);
    }
  };

  const handleGenerate = async () => {
    if (!image) return;
    
    setLoading(true);
    setError(null);
    setResults({});
    setGenerationErrors({});
    setPrompts([]);
    
    try {
      setProgressText("Preparing image data...");
      // Read the file ONCE at the start so we don't get FileReader permission revocation errors
      const filePart = await fileToGenerativePart(image.file);

      setProgressText("Analyzing image & brainstorming 10 distinct variations...");
      const conceptualPrompts = await generateVariationPrompts(filePart);
      
      if (!conceptualPrompts || conceptualPrompts.length === 0) {
        throw new Error("Failed to generate concepts. Please try again.");
      }
      
      setPrompts(conceptualPrompts);
      
      // Process sequentially to be safe with limits, updating UI as each completes
      const newResults: Record<number, string> = {};
      
      for (let i = 0; i < conceptualPrompts.length; i++) {
        setProgressText(`Rendering variation ${i + 1} of ${conceptualPrompts.length}...`);
        try {
          const generatedImage = await generateVariationImage(filePart, conceptualPrompts[i]);
          newResults[i] = generatedImage;
          setResults({ ...newResults }); // Force re-render with partial results
        } catch (imgError: any) {
          console.error(`Failed to generate variation ${i + 1}`, imgError);
          newResults[i] = "ERROR";
          setResults({ ...newResults });
          const errMsg = imgError?.message || "Generation failed";
          setGenerationErrors(prev => ({ ...prev, [i]: errMsg }));

          // Only break completely on hard permission/zero-quota blocks where nothing can succeed
          const isHardBlock = errMsg.includes("403") || errMsg.includes("PERMISSION_DENIED") || errMsg.includes("limit is 0");
          if (isHardBlock) {
            setError(errMsg);
            break;
          }
        }
        
        // Pacing delay between variations to stay comfortably within requests-per-minute (RPM) quotas
        if (i < conceptualPrompts.length - 1) {
            setProgressText(`Pacing requests to respect rate limits (${i + 1}/${conceptualPrompts.length})...`);
            await new Promise(r => setTimeout(r, 8500));
        }
      }
      
      setProgressText("All variations completed!");
      
      // Save history entry with the first successful result or all of them
      if (addToHistory) {
        const successes = Object.values(newResults).filter(val => val !== "ERROR");
        if (successes.length > 0) {
          addToHistory({
            id: Date.now().toString(),
            timestamp: Date.now(),
            resultImages: successes,
            tabId: 'variations',
            tabLabel: '10 Variations',
            inputs: { previewUrl: image.previewUrl, concepts: conceptualPrompts }
          });
        }
      }
      
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred.");
    } finally {
      if (progressText !== "All variations completed!") {
         setProgressText("");
      }
      setLoading(false);
    }
  };

  const downloadImage = (dataUrl: string, idx: number) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `variation_${idx + 1}.png`;
    link.click();
  };

  const downloadAll = async () => {
    const successImages = Object.entries(results).filter(([_, dataUrl]) => typeof dataUrl === 'string' && dataUrl !== "ERROR") as [string, string][];
    if (successImages.length === 0) return;

    setProgressText("Zipping images...");
    const zip = new JSZip();
    
    successImages.forEach(([idx, dataUrl]) => {
      // dataUrl is typically "data:image/png;base64,......."
      const base64Data = dataUrl.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
      zip.file(`variation_${parseInt(idx) + 1}.png`, base64Data, { base64: true });
    });

    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = "character_variations.zip";
    link.click();
    setProgressText("All variations completed!");
  };

  const completedCount = Object.values(results).filter(val => val && val !== "ERROR").length;
  const isAllRenderingFinished = Object.keys(results).length === prompts.length && prompts.length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">10 Design Variations Generator</h2>
        <p className="text-sm text-gray-500 mb-6">
          Upload an image, and our AI will analyze its core DNA, conceptualize 10 completely unique redesigns, and generate them for you.
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Original Design</label>
          <ImageUploader 
            image={image}
            onFileSelect={setImage}
            label="Drop design here"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={!image || loading}
          className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white py-3 px-6 rounded-lg transition-all font-medium disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
              <span>{progressText}</span>
            </>
          ) : (
            <span>Generate 10 Variations</span>
          )}
        </button>

        {progressText && !loading && !error && (
            <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm text-center">
                {progressText}
            </div>
        )}
      </div>

      {prompts.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-800">Generated Variations</h3>
            {completedCount > 0 && (
              <button
                onClick={downloadAll}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download All (Zip)</span>
              </button>
            )}
          </div>
          
          <div className="space-y-8">
            {prompts.map((prompt, idx) => (
              <div key={idx} className="flex flex-col md:flex-row gap-6 items-start border-b border-gray-100 pb-8 last:border-0 last:pb-0">
                <div className="w-full md:w-1/3 shrink-0">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 relative">
                    {results[idx] === "ERROR" ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500 p-3 text-center bg-red-50/50">
                            {retryingIndex === idx ? (
                              <>
                                <div className="w-6 h-6 border-2 border-indigo-400 border-t-indigo-600 rounded-full animate-spin mb-2" />
                                <span className="text-xs font-medium text-indigo-600">Retrying...</span>
                              </>
                            ) : (
                              <>
                                <span className="text-xl mb-1">⚠️</span>
                                <span className="text-xs font-semibold text-red-600">فشل التوليد المؤقت</span>
                                {generationErrors[idx] && (
                                  <span className="text-[10px] mt-1 text-gray-500 break-words line-clamp-2">
                                    {generationErrors[idx].includes("Rpc failed") ? "انقطاع شبكة مؤقت (XHR RPC)" : generationErrors[idx]}
                                  </span>
                                )}
                                <button
                                  onClick={() => retrySingleVariation(idx)}
                                  disabled={loading || retryingIndex !== null}
                                  className="mt-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded shadow-sm transition-colors"
                                >
                                  إعادة المحاولة / Retry
                                </button>
                              </>
                            )}
                        </div>
                    ) : results[idx] ? (
                      <img src={results[idx]} alt={`Variation ${idx + 1}`} className="w-full h-full object-contain bg-white" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                        {loading && !results[idx] && <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mb-2" />}
                        <span className="text-xs font-medium">{loading ? 'Waiting...' : 'Pending'}</span>
                      </div>
                    )}
                  </div>
                  {results[idx] && results[idx] !== "ERROR" && (
                    <button 
                      onClick={() => downloadImage(results[idx], idx)}
                      className="mt-3 w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-md transition-colors"
                    >
                      Download Image
                    </button>
                  )}
                </div>
                <div className="w-full md:w-2/3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold">
                      Variation {idx + 1}
                    </span>
                    <button
                      onClick={() => navigator.clipboard.writeText(prompt)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 transition-colors"
                      title="نسخ الفكرة / Copy prompt"
                    >
                      نسخ الفكرة / Copy
                    </button>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed italic border-l-4 border-indigo-200 pl-4 py-1">
                    "{prompt}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DesignVariations;
