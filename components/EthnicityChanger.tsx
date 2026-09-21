
import React, { useState, useCallback } from 'react';
import FeatureCard from './FeatureCard';
import ImageUploader from './ImageUploader';
import { changeEthnicity } from '../services/geminiService';
import type { ImageFile, HistoryItem } from '../types';
import { TrashIcon } from './icons/TrashIcon';

const ETHNICITIES = [
    { value: "Arabic", label: "عربي" },
    { value: "Turkish", label: "تركي" },
    { value: "European", label: "اروبي" },
    { value: "Mongolian", label: "مغولي" },
    { value: "Viking", label: "فايكينج" },
    { value: "African", label: "افريقي" },
];

interface EthnicityChangerProps {
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp' | 'tabId' | 'tabLabel'>) => void;
}

const EthnicityChanger: React.FC<EthnicityChangerProps> = ({ addToHistory }) => {
  const [image, setImage] = useState<ImageFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEthnicity, setSelectedEthnicity] = useState<string>(ETHNICITIES[0].value);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!image) {
      setError('Please upload an image.');
      return;
    }
    if (!selectedEthnicity) {
      setError('Please select an ethnicity.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await changeEthnicity(image.file, selectedEthnicity);
      addToHistory({
        resultImage: result,
        inputs: {
          sourceImage: image.previewUrl,
          ethnicity: selectedEthnicity,
        }
      });
    } catch (err) {
      if (err instanceof Error && (err.message.includes('429') || err.message.toUpperCase().includes('RESOURCE_EXHAUSTED'))) {
        setError('Rate limit exceeded. Please wait a minute and try again.');
        setIsRateLimited(true);
        setTimeout(() => setIsRateLimited(false), 60000);
      } else {
        setError('Failed to process image. Please try again.');
        console.error(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [image, selectedEthnicity, addToHistory]);
  
  const handleClear = useCallback(() => {
    setImage(null);
    setIsLoading(false);
    setError(null);
    setSelectedEthnicity(ETHNICITIES[0].value);
  }, []);

  return (
    <FeatureCard>
      <div>
        <h2 className="text-xl font-semibold mb-1 text-white">Change Ethnicity</h2>
        <p className="text-gray-400 mb-4 text-sm">Upload an image and select an ethnicity. The result appears in the History panel.</p>
        <div className="space-y-6">
          <ImageUploader image={image} onFileSelect={setImage} label="Source Image" />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Target Ethnicity
            </label>
            <div className="flex flex-wrap gap-2">
              {ETHNICITIES.map((e) => (
                <button
                  key={e.value}
                  onClick={() => setSelectedEthnicity(e.value)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    selectedEthnicity === e.value
                      ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={handleGenerate}
            disabled={!image || isLoading || isRateLimited}
            className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-300 flex items-center justify-center"
          >
            {isRateLimited ? 'Rate Limited (Wait 1m)' : isLoading ? 'Processing...' : 'Change Ethnicity'}
          </button>
          <button
              onClick={handleClear}
              className="p-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors"
              aria-label="Clear inputs"
              disabled={isLoading || isRateLimited}
            >
              <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </FeatureCard>
  );
};

export default EthnicityChanger;
