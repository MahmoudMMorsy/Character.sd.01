import React, { useState } from 'react';
import { generateCharacterKit } from '../services/geminiService';
import ImageUploader from './ImageUploader';
import { ImageFile } from '../types';

const CharacterKitGenerator: React.FC = () => {
  const [characterImage, setCharacterImage] = useState<ImageFile | null>(null);
  const [templateImage, setTemplateImage] = useState<ImageFile | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!characterImage) return;

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateCharacterKit(
        characterImage,
        templateImage || undefined
      );
      setResultImage(result);
    } catch (err: any) {
      setError(err.message || 'Failed to generate character kit.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Production Asset Kit Generator</h2>
        <p className="text-gray-600 mb-6">
          Upload any character and optionally a layout template. The AI will decompose the character into a T-pose base body and separate clothing/accessories, matching the template's layout perfectly.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              1. Layout Template (Optional)
            </label>
            <ImageUploader 
              onFileSelect={setTemplateImage} 
              image={templateImage}
              label="Upload Template (e.g., T-pose with separated clothes)" 
            />
            {templateImage && (
              <div className="mt-2 text-sm text-green-600 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                Template loaded
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              2. Target Character (Required)
            </label>
            <ImageUploader 
              onFileSelect={setCharacterImage} 
              image={characterImage}
              label="Upload Character to Decompose" 
            />
            {characterImage && (
              <div className="mt-2 text-sm text-green-600 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                Character loaded
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <p>{error}</p>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={!characterImage || isGenerating}
          className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors flex items-center justify-center ${
            !characterImage || isGenerating
              ? 'bg-blue-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isGenerating ? (
            <>
              <svg className="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              Generating Asset Kit...
            </>
          ) : (
            'Generate Asset Kit'
          )}
        </button>
      </div>

      {resultImage && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Generated Asset Kit</h3>
            <a
              href={resultImage}
              download="character_asset_kit.png"
              className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              Download
            </a>
          </div>
          <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex justify-center items-center p-4">
            <img 
              src={resultImage} 
              alt="Generated Asset Kit" 
              className="max-w-full h-auto object-contain max-h-[600px]"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterKitGenerator;
