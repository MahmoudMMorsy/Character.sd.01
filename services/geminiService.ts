
import { GoogleGenAI, Modality, Part, Type } from "@google/genai";
// import gifshot from "gifshot";
import { ImageFile, RetroGameStyle, GameStyleOption } from "../types";

const getApiKey = () => {
  // Vite will replace process.env.GEMINI_API_KEY at build time
  try {
    const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (key && key !== "undefined") {
      return key;
    }
  } catch (e) {}
  return '';
};

let useLocalEngine = false;

export const setUseLocalEngine = (useLocal: boolean) => {
    useLocalEngine = useLocal;
};

export const getUseLocalEngine = () => useLocalEngine;

// --- CONSTANTS ---
const IDENTITY_GUARD = " CRITICAL: The output image must represent the EXACT person from the source image. Preserve facial features, hair, body shape, and clothing details. Apply the requested art style (e.g., pixel art) as a filter over this person, but do not alter their identity.";

// --- HELPER FUNCTIONS ---

export const imageToOptimizedGenerativePart = async (input: ImageFile | File | Blob | string): Promise<Part> => {
    let srcUrl = '';
    let mimeType = 'image/jpeg';

    if (typeof input === 'string') {
        srcUrl = input.startsWith('data:') ? input : `data:image/jpeg;base64,${input}`;
    } else if (input && typeof input === 'object' && 'file' in input && input.file) {
        mimeType = input.file.type || 'image/jpeg';
        if (input.previewUrl && !input.previewUrl.startsWith('blob:')) {
            srcUrl = input.previewUrl;
        } else if (input.base64 && input.base64.length < 350000) {
            srcUrl = input.base64;
        } else {
            srcUrl = await new Promise<string>((resolve, reject) => {
                const r = new FileReader();
                r.onload = () => resolve(r.result as string);
                r.onerror = reject;
                r.readAsDataURL(input.file);
            });
        }
    } else if (input instanceof Blob) {
        mimeType = input.type || 'image/jpeg';
        srcUrl = await new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.onerror = reject;
            r.readAsDataURL(input);
        });
    }

    if (!srcUrl) {
        throw new Error("Invalid or empty image source provided.");
    }

    return new Promise<Part>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const MAX_DIM = 768;
            let w = img.naturalWidth || img.width || 512;
            let h = img.naturalHeight || img.height || 512;

            const scale = Math.min(1, MAX_DIM / Math.max(w, h));
            w = Math.max(1, Math.round(w * scale));
            h = Math.max(1, Math.round(h * scale));

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                const b64 = srcUrl.includes(',') ? srcUrl.split(',')[1] : srcUrl;
                resolve({ inlineData: { data: b64, mimeType } });
                return;
            }

            // Fill white background for transparent PNGs converted to JPEG
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);

            const targetMime = 'image/jpeg';
            const compressed = canvas.toDataURL(targetMime, 0.82);
            const data = compressed.split(',')[1];
            resolve({
                inlineData: {
                    data,
                    mimeType: targetMime
                }
            });
        };
        img.onerror = () => {
            const b64 = srcUrl.includes(',') ? srcUrl.split(',')[1] : srcUrl;
            resolve({ inlineData: { data: b64, mimeType } });
        };
        img.src = srcUrl;
    });
};

export const fileToGenerativePart = async (file: File): Promise<Part> => {
    if (!(file instanceof Blob)) {
        throw new Error("Invalid file object provided");
    }
    if (file.size === 0) {
        throw new Error("File is empty");
    }
    return imageToOptimizedGenerativePart(file);
};

const imageToDataUrl = (base64: string, mimeType: string) => `data:${mimeType};base64,${base64}`;

const normalizeAspectRatio = (ratio?: string): "1:1" | "3:4" | "4:3" | "9:16" | "16:9" | undefined => {
    if (!ratio) return undefined;
    if (ratio === "1:1" || ratio === "3:4" || ratio === "4:3" || ratio === "9:16" || ratio === "16:9") {
        return ratio;
    }
    if (ratio === "2:3") return "3:4";
    if (ratio === "3:2") return "4:3";
    return "1:1";
};

const callGeminiImage = async (parts: Part[], aspectRatio?: string): Promise<string> => {
    // Basic fallback for offline/local mode simulation if API key is missing
    if (!getApiKey() || useLocalEngine) {
        // Return the first image input as a mock result
        const firstImagePart = parts.find(p => p.inlineData);
        if (firstImagePart && firstImagePart.inlineData) {
            return imageToDataUrl(firstImagePart.inlineData.data, firstImagePart.inlineData.mimeType);
        }
        throw new Error("Local mode: Cannot generate new image without API key.");
    }

    let attempt = 0;
    const maxRetries = 4; // Allow enough retries to ride out rate limit and transient proxy windows

    while (attempt <= maxRetries) {
        try {
            const ai = new GoogleGenAI({ apiKey: getApiKey() });
            const validRatio = normalizeAspectRatio(aspectRatio);
            const response = await ai.models.generateContent({
                model: 'gemini-3.1-flash-lite-image',
                contents: { parts },
                config: validRatio ? {
                    imageConfig: {
                        aspectRatio: validRatio
                    }
                } : undefined
            });
            
            const candidates = response.candidates;
            if (candidates && candidates.length > 0) {
                 const candidate = candidates[0];
                 
                 // Check for safety finish reason
                 if (candidate.finishReason === 'SAFETY') {
                     throw new Error('Image generation blocked by safety filters. The model detected content it cannot process. Please try a different photo.');
                 }
                 
                 for (const part of candidate.content?.parts || []) {
                     if (part.inlineData) {
                         return imageToDataUrl(part.inlineData.data, part.inlineData.mimeType || 'image/png');
                     }
                 }
            }
            // If we get here, the model returned an empty response (often refusal without explicit safety flag)
            throw new Error('The model refused to generate an image for this prompt. Try simplifying the request or using a clearer image.');
        } catch (error: any) {
            let msg = '';
            if (typeof error === 'string') {
                msg = error;
            } else if (error?.message) {
                msg = error.message;
            } else {
                try {
                    msg = JSON.stringify(error);
                } catch {
                    msg = String(error);
                }
            }

            const isRateLimit = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota exceeded');
            const isRpcXhrError = msg.includes('Rpc failed') || msg.includes('xhr error') || msg.includes('ProxyUnaryCall') || msg.includes('error code: 6');
            const isTransientError = 
                isRateLimit ||
                isRpcXhrError ||
                msg.includes('500') || 
                msg.includes('502') || 
                msg.includes('503') || 
                msg.includes('504') || 
                msg.includes('Failed to fetch') || 
                msg.includes('NetworkError') ||
                msg.includes('"UNKNOWN"') ||
                msg.includes('UNKNOWN');
            const isSafety = msg.includes('safety') || msg.includes('blocked');
            const isPermission = msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('does not have permission');
            const isZeroLimit = msg.includes('limit: 0') || (msg.includes('Quota exceeded') && msg.includes('free_tier'));

            if (isPermission || isZeroLimit) {
                console.error("Gemini Image API Permission/Quota error:", error);
                throw new Error("توليد الصور بالذكاء الاصطناعي يتطلب حساباً مفعلاً به كوتا توليد الصور (Free tier limit is 0). يمكنك تفعيل الوضع المحلي (LOCAL) من الأعلى للتشغيل الفوري بدون انتظار.");
            }

            if (isTransientError && !isZeroLimit && attempt < maxRetries) {
                attempt++;
                let delayTime = 2500;
                
                // Parse server suggested retry delay if available
                const retryMatch = msg.match(/retry in ([0-9.]+)s/i) || msg.match(/"retryDelay":\s*"([0-9.]+)s"/i);
                if (retryMatch && retryMatch[1]) {
                    delayTime = Math.ceil(parseFloat(retryMatch[1]) * 1000) + 1500;
                } else if (isRateLimit) {
                    delayTime = Math.min(8000 + (attempt * 6000), 26000);
                } else if (isRpcXhrError) {
                    // For RPC proxy/XHR interruptions, quick exponential backoff
                    delayTime = Math.min(2000 * Math.pow(1.6, attempt), 9000);
                } else {
                    delayTime = Math.min(2500 * Math.pow(1.5, attempt), 10000);
                }

                console.warn(`Transient Gemini API / Network error (attempt ${attempt}/${maxRetries}): Retrying in ${Math.round(delayTime / 1000)}s...`);
                await new Promise(resolve => setTimeout(resolve, delayTime));
                continue;
            }
            
            if (isSafety) {
                throw error;
            }

            if (isRateLimit) {
                console.error("Gemini API Rate Limit exceeded:", error);
                throw new Error("تجاوزت الحد المسموح به من الطلبات في الدقيقة (Rate limit). يُرجى الانتظار 30 ثانية ثم الضغط على زر إعادة المحاولة.");
            }
            
            if (isRpcXhrError) {
                console.error("Gemini API RPC XHR Proxy Error:", error);
                throw new Error("تعذر الاتصال بخدمة الذكاء الاصطناعي مؤقتاً بسبب انقطاع في الشبكة أو ضغط على الخادم (Proxy RPC Timeout). يُرجى إعادة المحاولة.");
            }

            console.error("Gemini API Error:", error);
            const cleanMsg = msg.replace(/https:\/\/[^\s,]+/g, '[service-endpoint]');
            throw new Error(cleanMsg || "Failed to generate image. Please try again.");
        }
    }
    throw new Error("Service is currently busy. Please try again later.");
};

// --- EXPORTED FUNCTIONS ---

export const removeCharacter = async (file: File, mask?: File): Promise<string> => {
    const parts: Part[] = [await fileToGenerativePart(file)];
    if (mask) parts.push(await fileToGenerativePart(mask));
    parts.push({ text: "Remove the character from this image, leaving only the clothes and background. If a mask is provided, use it to identify the area to keep." });
    return callGeminiImage(parts);
};

export const removeBackground = async (file: File, tolerance: number = 25, softness: number = 2): Promise<string> => {
     const parts: Part[] = [await fileToGenerativePart(file)];
     parts.push({ text: `Remove the background from this image. Output the subject on a transparent background. Edge softness: ${softness}, Tolerance: ${tolerance}. Ensure the subject's edges are clean.` });
     return callGeminiImage(parts);
};

export const swapFaces = async (source: File, face: File): Promise<string> => {
    const parts: Part[] = [
        await fileToGenerativePart(source),
        await fileToGenerativePart(face),
        { text: "Swap the face from the second image onto the body of the first image. The resulting face MUST look exactly like the second image. The body must remain exactly like the first image. Maintain photorealism." }
    ];
    return callGeminiImage(parts);
};

export const virtualTryOn = async (person: File, clothes: File): Promise<string> => {
    const parts: Part[] = [
        await fileToGenerativePart(person),
        await fileToGenerativePart(clothes),
        { text: "Perform a virtual try-on. Dress the person in the first image with the clothes from the second image." + IDENTITY_GUARD }
    ];
    return callGeminiImage(parts);
};

export const changeColor = async (file: File, item: string, color: string, mask?: File): Promise<string> => {
    const parts: Part[] = [await fileToGenerativePart(file)];
    if (mask) parts.push(await fileToGenerativePart(mask));
    parts.push({ text: `Change the color of the ${item} to ${color}. Maintain texture and lighting. Do not change the person's identity or skin tone.` });
    return callGeminiImage(parts);
};

export const remixImage = async (files: File[], prompt: string): Promise<string> => {
    const parts: Part[] = [];
    for (const f of files) {
        parts.push(await fileToGenerativePart(f));
    }
    parts.push({ text: `Remix these images. ${prompt} ${IDENTITY_GUARD}` });
    return callGeminiImage(parts);
};

export const changeEthnicity = async (file: File, ethnicity: string): Promise<string> => {
    const parts: Part[] = [await fileToGenerativePart(file)];
    parts.push({ text: `Change the ethnicity of the person in the image to ${ethnicity}. Maintain pose, clothing, and background.` });
    return callGeminiImage(parts);
};

export const convertToTPose = async (file: File): Promise<string> => {
    const parts: Part[] = [await fileToGenerativePart(file)];
    parts.push({ text: "Convert the character in this image to a T-Pose. Maintain the character's exact face, hair, and clothing." + IDENTITY_GUARD });
    return callGeminiImage(parts);
};

const callGeminiImageHighQuality = async (parts: Part[]): Promise<string> => {
    if (!getApiKey() || useLocalEngine) {
        const firstImagePart = parts.find(p => p.inlineData);
        if (firstImagePart && firstImagePart.inlineData) {
            return imageToDataUrl(firstImagePart.inlineData.data, firstImagePart.inlineData.mimeType);
        }
        throw new Error("Local mode: Cannot generate new image without API key.");
    }

    try {
        const ai = new GoogleGenAI({ apiKey: getApiKey() });
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-image',
            contents: { parts },
            config: {
                imageConfig: {
                    aspectRatio: "1:1"
                }
            }
        });

        const candidates = response.candidates;
        if (candidates && candidates.length > 0) {
            const candidate = candidates[0];
            if (candidate.finishReason === 'SAFETY') {
                throw new Error('Image generation blocked by safety filters. The model detected content it cannot process. Please try a different photo.');
            }
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData) {
                    return imageToDataUrl(part.inlineData.data, part.inlineData.mimeType || 'image/png');
                }
            }
        }
        throw new Error("Failed to generate high-quality image.");
    } catch (e: any) {
        const msg = e.message || '';
        if (msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('does not have permission')) {
            throw new Error("Gemini API Permission Denied (403): High-quality image generation requires an active Gemini API key with billing/permissions enabled.");
        }
        // Try fallback to lite model
        return callGeminiImage(parts, "1:1");
    }
};

export const convertToRealisticAnatomy = async (image: ImageFile): Promise<string> => {
    const imagePart = await imageToOptimizedGenerativePart(image);
    const parts: Part[] = [imagePart];
    parts.push({ text: "Full body reference of a female human in T-pose, neutral lighting, solid white background, high-resolution digital 3D model, realistic skin texture, professional anatomy reference, no clothing, no accessories, clean and clear view, no annotations, no sketches, no wireframes, no gray clay. The skin tone should be vibrant, natural, and realistic." });
    return callGeminiImage(parts);
};

export const convertToRealisticImage = async (image: ImageFile): Promise<string> => {
    const imagePart = await imageToOptimizedGenerativePart(image);
    const parts: Part[] = [imagePart];
    parts.push({ text: `[CRITICAL IDENTITY LOCK]: You MUST preserve the exact person's facial features and identity from the source image.
    
    1. FRONT PROFILE: The subject MUST be looking directly at the camera in a centered front profile view.
    2. REALISM: Create a cinematic, photorealistic real-life photograph. DO NOT OUTPUT A CARTOON OR 3D RENDER. Premium DSLR quality, natural studio lighting, 8k resolution.
    
    User's required prompt: حول الصور المرفقة الي صور حقيقيه فاتنه وشديدة الجمال مع الحفاظ على نفس الالوان والكونسبت الاصلي للتشريح مفرطة الواقعية بجوده عاليه hd full hd باحدث كاميرا واعلي جوده 8k مع إصلاح اي خلل او رتوش اجعلها واقعيه وليست كرتون واقعي` });
    return callGeminiImage(parts);
};

export const convertToAggressivePixelSprite = async (image: ImageFile, mood: 'aggressive' | 'normal' = 'aggressive'): Promise<string> => {
    const imagePart = await imageToOptimizedGenerativePart(image);
    const parts: Part[] = [imagePart];
    
    const aggressiveText = `Analyze the main character or animal in the provided image. Crucially, YOU MUST PRESERVE THE EXACT GENDER/SEX OF THE ORIGINAL CHARACTER. If the character is female, the sprite must clearly be female (preserving feminine features, hair, or clothing). If male, it must be male. Generate a high-detail 16-bit pixel art character sprite of an aggressive, anthropomorphic version of whatever creature or person is in the image, standing on two legs. The character has a distinct, chibi-style, compact body structure: broad-shouldered and heavily muscled, with powerful limbs and large, clawed hands and feet, but overall short and stout. The head is large, with a twisted, sinister expression of pure rage and malice. The eyes are narrowed, burning with a red-hot malevolent glow. The mouth is open in a wide, ferocious snarl, revealing jagged, sharp teeth. Drool and spittle are rendered in small pixel details. The fur/skin/clothing is shaggy and disheveled. The character is posed ready for attack, with one hand clenched in a powerful fist. Clean, sharp dark outlines define the entire figure. Hyper-saturated colors and dithered shading are used for a dynamic, console-era feel. Faint blocky retro glow. White, plain background for immediate character isolation.`;
    
    const normalText = `Analyze the main character or animal in the provided image. Crucially, YOU MUST PRESERVE THE EXACT GENDER/SEX OF THE ORIGINAL CHARACTER. If the character is female, the sprite must clearly be female (preserving feminine features, hair, or clothing). If male, it must be male. Generate a high-detail 16-bit pixel art character sprite of an anthropomorphic version of whatever creature or person is in the image, standing on two legs. The character has a distinct, chibi-style, compact body structure: well-proportioned, short and stout. The head is large, with a calm, friendly, or neutral expression. The eyes are expressive and clear. The mouth is relaxed. The fur/skin/clothing is neat and stylized. The character is in a basic, neutral standing pose (idle animation pose). Clean, sharp dark outlines define the entire figure. Vibrant colors and dithered shading are used for a classic, console-era feel. Faint blocky retro glow. White, plain background for immediate character isolation.`;

    parts.push({ text: mood === 'aggressive' ? aggressiveText : normalText });
    return callGeminiImage(parts);
};

export const RETRO_GAME_STYLES: GameStyleOption[] = [
    {
        id: 'maple_story',
        name: 'MapleStory (메이플스토리)',
        subtitle: 'Nexon 2D Side-Scrolling MMORPG',
        era: '2003 / 2D Chibi PC',
        badge: 'Chibi Anime',
        description: 'Iconic cute 2.5-head chibi proportions, large expressive anime eyes, clean pixel outlines, vibrant pastel palette, and charming hairstyles.'
    },
    {
        id: 'shantae_pirate_curse',
        name: "Shantae and the Pirate's Curse",
        subtitle: 'WayForward High-End 16/32-Bit Action',
        era: '2014 / 3DS & GBA Style',
        badge: 'Vibrant 32-Bit',
        description: 'Fluid dynamic anime proportions, crisp black contours, rich jewel tones (crimson, purple, gold), flowing hair, and energetic pirate-fantasy posing.'
    },
    {
        id: 'tarzan_1999',
        name: "Disney's Tarzan (1999)",
        subtitle: 'Eurocom / Digital Eclipse Action Platformer',
        era: '1999 / PS1 & PC Platformer',
        badge: 'Late 90s Disney 2D',
        description: 'Athletic anatomical platformer sprites, lush jungle color palette (sepia, emerald, mahogany), hand-drawn Disney animation feel, and dynamic crouching stances.'
    },
    {
        id: 'classic_platformer',
        name: 'Classic 8-Bit / 16-Bit Platformer',
        subtitle: 'Super Mario World & Adventure Island',
        era: 'NES / SNES Classic',
        badge: 'Retro 16-Bit',
        description: 'Iconic chunky pixel blocks, bold outlines, nostalgic arcade color palette, and jump-and-run platformer silhouettes.'
    },
    {
        id: 'metal_slug',
        name: 'Metal Slug Arcade',
        subtitle: 'SNK / Nazca Neo-Geo 2D Masterpiece',
        era: 'Neo Geo Arcade',
        badge: 'Hyper-Detailed',
        description: 'Masterclass hyper-detailed military 2D pixel art, gritty hand-placed dithering, dynamic fabric folds, and combat-ready proportions.'
    },
    {
        id: 'castlevania',
        name: 'Castlevania: Symphony of the Night',
        subtitle: 'Konami 32-Bit Gothic Metroidvania',
        era: 'PS1 / GBA Gothic',
        badge: 'Gothic 32-Bit',
        description: 'Sophisticated gothic dark fantasy aesthetic, aristocratic cloak/attire flow, moody highlights, and elegant weapon stances.'
    },
    {
        id: 'pokemon_gba',
        name: 'Pokémon Emerald / Gen 3 GBA',
        subtitle: 'Game Boy Advance Trainer Sprite',
        era: 'GBA 16-Bit',
        badge: 'GBA Anime',
        description: 'Clean bright anime trainer sprite aesthetic with friendly proportions, bold outline contours, and classic handheld color palettes.'
    }
];

export const convertToRetroPixelSprite = async (image: ImageFile, gameStyle: RetroGameStyle | string = 'maple_story'): Promise<string> => {
    const imagePart = await imageToOptimizedGenerativePart(image);
    const parts: Part[] = [imagePart];

    let stylePrompt = '';

    if (gameStyle === 'maple_story') {
        stylePrompt = `GENERATE AN AUTHENTIC MAPLESTORY 2D MMORPG PIXEL ART CHARACTER SPRITE SHEET.
Style & Aesthetic: Official MapleStory (Nexon) 2D side-scrolling cute chibi MMORPG pixel art.
Proportions: Cute chibi proportions (approx 2.5 to 3 heads tall), large oversized round head, adorable glossy anime eyes with expressive sparkle, cute tiny mouth, distinctive anime hairstyle with clean stepped pixel shading.
Contour & Palette: Bold clean dark pixel outlines, vibrant and pastel anime color palette, smooth cell dithering, fantasy adventurer outfit adapted faithfully from the uploaded character.
Preserve: CRUCIALLY PRESERVE THE EXACT GENDER, ETHNICITY/SKIN TONE, HAIR COLOR, AND DISTINCTIVE FACIAL TRAITS of the original character.
Angles & Arrangement: The sprite sheet MUST display the character shown in 5 DIFFERENT DIRECTIONS/ANGLES:
1) Front-facing idle pose
2) Back view
3) Left walking profile
4) Right walking profile
5) 3/4 angled action stance
All 5 sprites arranged neatly side-by-side on a completely plain, solid, pure white background for effortless character isolation. No props, no scenery, no floor shadow.`;
    } else if (gameStyle === 'shantae_pirate_curse') {
        stylePrompt = `GENERATE AN AUTHENTIC "SHANTAE AND THE PIRATE'S CURSE" (WayForward) 16-BIT / 32-BIT PIXEL ART SPRITE SHEET.
Style & Aesthetic: Signature WayForward high-energy 2D action-platformer pixel art (as seen in Shantae and the Pirate's Curse for 3DS / GBA / PC).
Proportions: Athletic, stylized, expressive anime hero proportions with dynamic fluid silhouette, dramatic voluminous flowing hair, and ornate pirate/Arabian fantasy adventurer attire inspired by the original character's clothing.
Line Art & Palette: Crisp, razor-sharp dark pixel contours, hyper-vibrant jewel-tone palette (rich purples, vivid teals, glowing golds, vibrant reds), high-contrast anime cell pixel shading with clean specular highlights.
Preserve: CRUCIALLY PRESERVE THE EXACT GENDER, SKIN TONE, HAIR COLOR, AND EYE IDENTITY of the original character.
Angles & Arrangement: The sprite sheet MUST show the character rendered in 5 DIFFERENT POSES/ANGLES:
1) Front ready stance
2) Back view
3) Left sprint/run profile
4) Right sprint/run profile
5) 3/4 combat battle stance
Arranged horizontally side-by-side on a pure, solid, clean white background with no background scenery or artifacts for instant sprite extraction.`;
    } else if (gameStyle === 'tarzan_1999') {
        stylePrompt = `GENERATE AN AUTHENTIC "DISNEY'S TARZAN (1999 PC / PS1 / GBC)" PLATFORMER PIXEL ART SPRITE SHEET.
Style & Aesthetic: Classic late-90s Eurocom / Digital Eclipse 1999 Disney's Tarzan action-platformer sprite art.
Proportions & Anatomy: Athletic heroic proportions with fluid Disney-style anatomical lines, agile silhouette, jungle-ready adventure outfit adapting the character's clothing into rugged adventure gear (or tunic/loincloth/jungle expedition style).
Palette & Shading: Earthy, lush 1999 adventure game palette: warm sun-tanned skin tones, lush jungle greens, rich mahogany browns, warm golden hour ambient rim lighting, and detailed 16-bit/32-bit dithering typical of the 1999 Tarzan PC/PS1 era.
Preserve: CRUCIALLY PRESERVE THE ORIGINAL CHARACTER'S GENDER, FACIAL IDENTITY, HAIR TEXTURE, AND DISTINCTIVE FEATURES.
Angles & Arrangement: The sprite sheet MUST depict the character from 5 DIFFERENT DIRECTIONS:
1) Front heroic standing pose
2) Back view
3) Left jungle sprint silhouette
4) Right jungle sprint silhouette
5) 3/4 dynamic crouching vine/action pose
Arranged side-by-side in a horizontal row on a solid, clean, pure white background for immediate extraction.`;
    } else if (gameStyle === 'metal_slug') {
        stylePrompt = `GENERATE A NEO GEO ARCADE 2D SPRITE SHEET in the legendary pixel art style of Metal Slug (Nazca / SNK).
Style: Masterclass hyper-detailed 2D arcade pixel art, military-tactical comic flair, gritty hand-placed pixel dithering, dynamic folds in cloth, combat-ready silhouette.
Crucially, preserve the original character's gender, skin tone, and distinguishing facial markers.
Show the character in 5 distinct poses and angles (Front, Back, Left run, Right run, 3/4 tactical aim) horizontally arranged on a solid pure white background.`;
    } else if (gameStyle === 'castlevania') {
        stylePrompt = `GENERATE A 32-BIT GOTHIC ACTION-RPG METROIDVANIA SPRITE SHEET in the iconic style of Castlevania: Symphony of the Night (Konami PS1/GBA).
Style: Elegant gothic dark fantasy aesthetic, aristocratic cape/coat flow, sophisticated muted jewel palette with moody highlights, detailed weapon/armor pixel shading.
Crucially, preserve the original character's gender, ethnicity, and recognizable traits.
Show the character in 5 directions (Front, Back, Left walk, Right walk, 3/4 gothic pose) side-by-side on a plain solid white background.`;
    } else if (gameStyle === 'pokemon_gba') {
        stylePrompt = `GENERATE A CLASSIC NINTENDO GBA OVERWORLD & BATTLE SPRITE SHEET in the style of Pokémon Emerald / Gen 3 GBA.
Style: Clean 16-bit anime trainer pixel art with friendly proportions, charming bold contours, vibrant limited GBA color palettes.
Crucially, preserve the original character's gender, hair, and clothing identity.
5 distinct directional angles (Front, Back, Left, Right, 3/4) arranged horizontally on a pure solid white background.`;
    } else {
        stylePrompt = `GENERATE A RETRO 8-BIT OR 16-BIT PIXEL ART CHARACTER SPRITE SHEET in the style of classic platformer games like Super Mario Bros and Adventure Island.
Crucially, YOU MUST PRESERVE THE EXACT GENDER/SEX OF THE ORIGINAL CHARACTER.
The character should have simple, stylized retro gaming proportions, with vibrant, limited color palettes and distinct pixelation blocks.
The image MUST contain the character shown from 5 DIFFERENT DIRECTIONS/ANGLES (Front view, Back view, Left profile, Right profile, and a 3/4 angle view) arranged side-by-side.
Ensure the characters are placed entirely alone on a completely plain, solid white background with absolutely no other background elements, scenery, or props.`;
    }
    
    parts.push({ text: `Analyze the main character in the provided image. ${stylePrompt}` });
    return callGeminiImage(parts);
};

export const convertToChild = async (image: ImageFile): Promise<string> => {
    const imagePart = await imageToOptimizedGenerativePart(image);
    const parts: Part[] = [imagePart];
    
    parts.push({ text: `[CRITICAL IDENTITY LOCK]: This is an AI age-regression task for biometric identity matching.
    
    Task: Take the adult face in the uploaded image and generate a highly realistic childhood version of THIS EXACT INDIVIDUAL as a 5-year-old child.
    
    IDENTITY CONSTRAINTS:
    1. FACIAL BIOMETRICS: You MUST preserve the exact same eye shape, iris detail, unique nose structure, lip line, and ear shape of the person in the source image. 
    2. RECOGNIZABILITY: If someone who knows this adult saw this child photo, they must immediately say "This is a photo of [Person Name] when they were a kid."
    3. NO HALLUCINATION: Do not change eye color, hair type, or skin tone.
    4. AGE ADAPTATION: Naturally scale the features for a 5-year-old (rounder face, larger eyes relative to face size, softer jawline) but keep the distinctive individual markers that make this person unique.
    
    AESTHETIC REQUIREMENTS:
    - Ultra-realistic DSLR photography, 8k resolution, documentary-style lighting.
    - Photorealistic skin textures with soft child-like finish.
    - ABSOLUTELY NO 3D rendering, NO doll-like skin, NO AI-generated "perfect" faces. It must look like a real, slightly imperfect historical childhood photograph.
    - The child should be wearing a miniature, size-appropriate version of the adult's outfit from the photo.` });
    return callGeminiImage(parts, "2:3");
};

export const convertToMannequinHead = async (image: ImageFile, preserveTexture: boolean): Promise<string> => {
    const imagePart = await imageToOptimizedGenerativePart(image);
    const parts: Part[] = [imagePart];
    
    const texturePrompt = preserveTexture 
        ? "Keep the ultra-realistic human skin texture, natural pores, and subtle human imperfections completely intact." 
        : "Apply a smooth, uniform skin texture. MUST still look like a real photograph, absolutely NOT a 3D plastic render.";

    parts.push({ text: `[CRITICAL FACE ID LOCK]: You MUST edit the EXACT person in the attached image. Do NOT generate a random or different face. Keep the exact same nose, lips, jawline, and face shape.
    
    Modify THIS EXACT PERSON to have the following artistic mannequin style:
    1. FRONT PROFILE: Ensure they are looking straight at the camera.
    2. BALD & BARE: Give them a perfectly smooth bald head. Remove all clothing, glasses, and accessories (just a clean neck/bust).
    3. MANNEQUIN EYES & MOUTH: Replace the realistic eyes with smooth, stylized dark abstract eyes (like a designer mannequin). If the lips are parted, the inside should just be a smooth dark shadow (no teeth or tongue). Do not mention violence, keep it elegant and architectural.
    4. STYLE: Ultra-realistic 8K DSLR photograph of a high-end fashion mannequin. NOT CGI, NOT plastic. It must look like a real physical sculpture in a photo.
    5. BACKGROUND: Smooth Golden-Orange gradient studio background.
    6. ${texturePrompt}
    
    DO NOT change the person's identity! It must look exactly like the person in the reference image, just styled as an elegant, bald, abstract sculpture.` });
    
    return callGeminiImage(parts, "3:4");
};

export const layerClothing = async (character: File, clothes: File[]): Promise<string> => {
    const parts: Part[] = [await fileToGenerativePart(character)];
    for (const c of clothes) {
        parts.push(await fileToGenerativePart(c));
    }
    parts.push({ text: "Layer these clothing items onto the character. The first image is the character. Maintain the character's identity perfectly." + IDENTITY_GUARD });
    return callGeminiImage(parts);
};

export const buildOutfit = async (character: File, items: File[]): Promise<string> => {
     const parts: Part[] = [await fileToGenerativePart(character)];
     for (const i of items) {
         parts.push(await fileToGenerativePart(i));
     }
     parts.push({ text: "Build an outfit on the character using the provided items (Headwear, Top, Bottom)." + IDENTITY_GUARD });
     return callGeminiImage(parts);
};

export const generateClothing = async (prompt: string): Promise<string> => {
    const parts: Part[] = [{ text: `Generate a clothing item: ${prompt}. White background.` }];
    return callGeminiImage(parts);
};

export const generateImage = async (prompt: string): Promise<string> => {
    const parts: Part[] = [{ text: prompt }];
    return callGeminiImage(parts);
};

export const convertTo3DModel = async (file: File): Promise<string> => {
    const parts: Part[] = [await fileToGenerativePart(file)];
    parts.push({ text: "Generate a normal map texture for this character image to be used in 3D modeling." });
    return callGeminiImage(parts);
};

export const bananaAnimate = async (frames: File[], image: File): Promise<string> => {
    // Generate a motion-transferred image based on reference frames
    const parts: Part[] = [await fileToGenerativePart(image)];
    if(frames.length > 0) parts.push(await fileToGenerativePart(frames[0]));
    parts.push({ text: "Apply the motion/pose from the reference frame to the character image." + IDENTITY_GUARD });
    return callGeminiImage(parts);
};

export const decomposeCharacter = async (file: File): Promise<string[]> => {
    const identityPrompt = "Keep the exact facial features and body proportions of the original character. ";
    const prompts = [
        "Generate a full body T-pose of this character. " + identityPrompt,
        "Generate the head and hair texture of this character. " + identityPrompt,
        "Generate the clothing texture of this character. " + identityPrompt,
        "Generate the accessories texture of this character."
    ];
    
    try {
        const results = await Promise.all(prompts.map(async (prompt) => {
             const parts: Part[] = [await fileToGenerativePart(file), { text: prompt }];
             return await callGeminiImage(parts);
        }));
        return results;
    } catch (e) {
        const one = await convertToTPose(file);
        return [one, one, one, one];
    }
};

export const generateGhostMannequin = async (file: File): Promise<string> => {
    const parts: Part[] = [await fileToGenerativePart(file)];
    parts.push({ text: "Create a ghost mannequin effect for the clothing in this image. Remove the model." });
    return callGeminiImage(parts);
};

export const restorePhoto = async (file: File, withColorization: boolean): Promise<string> => {
    const parts: Part[] = [await fileToGenerativePart(file)];
    parts.push({ text: `Restore this old photo. Fix scratches and blur. Preserve the facial features exactly.${withColorization ? ' Colorize it.' : ''}` });
    return callGeminiImage(parts);
};

export const generateStreetFashion = async (model: File, outfit: File): Promise<string> => {
     const parts: Part[] = [
        await fileToGenerativePart(model),
        await fileToGenerativePart(outfit),
        { text: "Street fashion photoshoot. Dress the model in the provided outfit and place them in a street setting." + IDENTITY_GUARD }
    ];
    return callGeminiImage(parts);
};

const getImageDimensions = (src: string): Promise<{width: number, height: number}> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = reject;
        img.src = src;
    });
};

const getClosestAspectRatio = (width: number, height: number): string => {
    const ratio = width / height;
    const ratios = [
        { name: '1:1', val: 1 },
        { name: '4:3', val: 4/3 },
        { name: '3:4', val: 3/4 },
        { name: '16:9', val: 16/9 },
        { name: '9:16', val: 9/16 }
    ];
    let closest = ratios[0];
    let minDiff = Math.abs(ratio - closest.val);
    for (const r of ratios) {
        const diff = Math.abs(ratio - r.val);
        if (diff < minDiff) {
            minDiff = diff;
            closest = r;
        }
    }
    return closest.name;
};

const resizeImage = (src: string, targetWidth: number, targetHeight: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(src);
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = src;
    });
};

export const generateCharacterKit = async (character: ImageFile, template?: ImageFile): Promise<string> => {
    const parts: Part[] = [];
    let targetWidth = 0;
    let targetHeight = 0;
    let aspectRatio: string | undefined = undefined;
    
    const imageFileToPart = async (img: ImageFile): Promise<Part> => {
        return await fileToGenerativePart(img.file);
    };

    if (template) {
        parts.push(await imageFileToPart(template));
        if (template.previewUrl) {
            try {
                const dims = await getImageDimensions(template.previewUrl);
                targetWidth = dims.width;
                targetHeight = dims.height;
                aspectRatio = getClosestAspectRatio(dims.width, dims.height);
            } catch (e) {
                console.error("Failed to get template dimensions", e);
            }
        }
    }
    parts.push(await imageFileToPart(character));
    
    const prompt = template ? `
    You are an expert game sprite artist. You are given two images:
    Image 1 (Template): Defines the layout, art style, and body proportions (e.g., stylized or chibi).
    Image 2 (Character): The character design to use.

    Please create a character kit by following these steps:
    1. Body Proportions: Draw the character using the exact body proportions, size, head-to-body ratio, and pose from Image 1.
    2. Layout: Draw the character's clothing and accessories separated from the base body, placed in the exact same spatial locations as seen in Image 1.
    3. Style Translation: Adapt the character's face, hair, and colors from Image 2 to match the art style of Image 1.
    4. Background: Use a plain white background.
    ` : `
    Create a 2D game asset sprite sheet based on the provided character image.
    1. Draw the character in a neutral standing pose (T-pose or A-pose) in the center. Use simple, non-revealing clothing for the base body.
    2. Draw the character's clothing, armor, and accessories as separate individual items arranged around the character.
    3. Maintain the character's original facial features, hair, and overall style.
    4. Use a clean, solid background.
    `;
    
    parts.push({ text: template ? prompt : prompt + IDENTITY_GUARD });
    
    const generatedImage = await callGeminiImage(parts, aspectRatio);
    
    if (targetWidth > 0 && targetHeight > 0) {
        return await resizeImage(generatedImage, targetWidth, targetHeight);
    }
    
    return generatedImage;
};

export const detectSpriteFrames = async (file: File): Promise<{ cols?: number; rows?: number; frames?: { x: number; y: number; w: number; h: number }[] }> => {
    if (!getApiKey() || useLocalEngine) {
        return { cols: 4, rows: 1 }; // Default fallback
    }

    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const imagePart = await fileToGenerativePart(file);

    const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
            parts: [
                imagePart,
                { text: "Analyze this sprite sheet. Your task is to extract individual animation frames. CRITICAL: Each frame MUST contain exactly ONE character and ONE single pose/movement. Do not group multiple characters or multiple poses together. If they follow a regular grid, return the number of columns and rows that perfectly slice the sheet into single-character, single-pose frames. If they are irregular, return a list of bounding boxes [x, y, width, height] for each individual frame in pixels. Return ONLY the JSON object. Example: {\"cols\": 4, \"rows\": 1} or {\"frames\": [{\"x\": 0, \"y\": 0, \"w\": 32, \"h\": 32}, ...]}" }
            ]
        }
    });

    try {
        const text = response.text || "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse AI response for sprite detection", e);
        return { cols: 4, rows: 1 };
    }
};

export const createGif = async (
    frames: File[], 
    delay: number, 
    width: number | null, 
    height: number | null, 
    onProgress?: (progress: number) => void
): Promise<string> => {
    console.warn("GIF creation is not supported without external libraries in this environment.");
    if (onProgress) onProgress(1.0);
    if (frames.length > 0) {
        const part = await fileToGenerativePart(frames[0]);
        return imageToDataUrl(part.inlineData.data, part.inlineData.mimeType);
    }
    return "";
};

export const generateExpressionSheet = async (imageFile: File): Promise<string> => {
    const parts: Part[] = [await fileToGenerativePart(imageFile)];
    
    const prompt = `
    Generate a professional "Character Expression Sheet" containing exactly 36 different faces (6x6 Grid).
    
    >>> CRITICAL: CAMERA ANGLE LOCK <<<
    1. ANALYZE the source image's camera angle (Front View, 3/4 View, Side Profile).
    2. FORCE ALL 36 expressions to strictly match this EXACT angle. 
    3. If source is Side Scroller View, ALL 36 faces must be Side View. NO ROTATION allowed.
    4. If source is Front View, ALL 36 faces must be Front View.

    >>> IDENTITY PRESERVATION <<<
    1. Keep the character's exact features: Nose/Beak shape, Hair style, Beard/Mustache (if any), Accessories (Glasses, Hats).
    2. DO NOT add items that are not in the source. DO NOT remove items that are in the source.
    3. Maintain the general concept and color palette of the original design.

    >>> STYLE: MASTERPIECE CARTOON ANIMATION <<<
    1. Style Reference: High-budget Classic Animation (Tex Avery, Chuck Jones, MGM, Disney, The Mask).
    2. PHYSICS: Apply extreme "Squash and Stretch".
    3. EXAGGERATION: Include "Wild Takes" and extreme reactions:
       - Jaw dropping to the floor.
       - Eyes popping out of sockets (3D protrusion).
       - Tongue rolling out like a carpet.
       - Face melting in sadness.
       - Head exploding in anger (visual metaphor).
       - Heart eyes for love.
    
    Layout: 6 rows x 6 columns. Transparent background.
    `;

    parts.push({ text: prompt });
    return callGeminiImage(parts);
};

// Updated signature to accept new params
export const generateSpriteSheet = async (
    imageFile: File, 
    style: string = 'action-platformer', 
    generationMode: 'strict' | 'style' | 'caricature' = 'strict',
    proportion: 'realistic' | 'heroic' | 'chibi' = 'heroic',
    renderStyle: 'keep_original' | 'pixel_retro' | 'modern_2d' | 'ps1_retro' | 'ps4_modern' | 'retro_pixar' | 'hand_drawn' = 'modern_2d',
    isInPlaceAnimation: boolean = false,
    additionalPrompt: string = ""
): Promise<string> => {
    
    if (useLocalEngine || !navigator.onLine) {
        await new Promise(r => setTimeout(r, 1000));
        const imagePart = await fileToGenerativePart(imageFile);
        return imageToDataUrl(imagePart.inlineData.data, imagePart.inlineData.mimeType); 
    }

    try {
        const imagePart = await fileToGenerativePart(imageFile);
        let styleIns = "", layoutIns = "";

        // --- CAMERA DEFINITIONS ---
        const sideScrollerCam = "Camera Angle: STRICTLY Side-Scrolling 2.5D (Profile View). The character must face Left or Right.";
        const isometricCam = "Camera Angle: STRICTLY Isometric 2.5D (Clash of Clans style). View from a high, slanted angle (approx 45 degrees). Characters MUST face diagonally (South-East or South-West) on a grid.";
        const racingCam = "Camera Angle: STRICTLY Rear View (Third-Person Chase Camera). You are seeing the BACK of the vehicle.";
        const crashCam = "Camera Angle: 3rd Person Behind Back (Crash Bandicoot Style). Character runs INTO the screen.";
        const fightCam = "Camera Angle: Fighting Game Side View (Street Fighter/Tekken). Large characters, detailed stance. Ground level.";
        const smashCam = "Camera Angle: Distant Side View (Platform Fighter). Characters are smaller to fit screen.";

        // --- STANDARD LAYOUT TEMPLATES (Rows 1-8/9) ---
        const standardPlatformerLayout = "Row 1: Idle (Ready Stance, Breathing). Row 2: Walk (Exaggerated cycle). Row 3: Run (Fast/Smear frames). Row 4: Jump (Squash start, Stretch air, Squash land). Row 5: Attack (Wind-up, Strike, Follow-through). Row 6: Defend/Block. Row 7: Hurt/Damage (Impact distortion). Row 8: Die (Dramatic/Comical). Row 9: Special/Win.";
        const standardIsometricLayout = "Row 1: Idle (Ready). Row 2: Walk. Row 3: Run. Row 4: Attack 1. Row 5: Attack 2/Special. Row 6: Defend/Block. Row 7: Hurt. Row 8: Die. Row 9: Victory/Taunt.";
        const standardRacingLayout = "Row 1: Idle (Revving). Row 2: Drive (Straight). Row 3: Boost/Turbo (Fast). Row 4: Jump/Bounce. Row 5: Turn Left. Row 6: Turn Right. Row 7: Crash/Damage. Row 8: Wrecked/Die.";
        const fightingLayout = "Row 1: Stance (Breathing). Row 2: Walk Forward/Back. Row 3: Punch Combo. Row 4: Kick Combo. Row 5: Special Projectile/Move. Row 6: Anti-Air/Uppercut. Row 7: Block/Crouch. Row 8: Hit/Stun. Row 9: KO/Win.";

        // --- BUILD CHARACTER DEFINITION (styleIns) ---
        // Using partial matching for grouped IDs to save space while maintaining specificity
        if (style.startsWith('maple-mushmom') || style.startsWith('maple-zakum') || style.startsWith('maple-pinkbean') || style.startsWith('maple-balrog') || style.startsWith('maple-horntail') || style.startsWith('maple-kingslime')) {
             styleIns = `Style Reference: MapleStory Iconic World Boss (Nexon 2D MMORPG). Aesthetics: Authentic 2D side-scrolling MapleStory epic Boss pixel art. Preserving the boss's iconic scale, cute yet menacing anime features, bold stepped pixel dithering, vibrant arcade color tones. ${sideScrollerCam}`;
             layoutIns = "Row 1: Idle (Menacing breath & float). Row 2: Walk/Hover. Row 3: Minor Attack/Charge. Row 4: Signature Ultimate Spell/Laser/Slam. Row 5: Area-of-Effect Hazard/Stomp. Row 6: Defensive Guard. Row 7: Hurt/Hit Stun. Row 8: Dramatic Boss Defeat/Explode. Row 9: Enrage/Roar.";
        } else if (style.startsWith('maple-mushroom') || style.startsWith('maple-slime') || style.startsWith('maple-ribbonpig') || style.startsWith('maple-wildboar') || style.startsWith('maple-evil-eye') || style.startsWith('maple-lupin') || style.startsWith('maple-pepe') || style.startsWith('maple-yeti')) {
             styleIns = `Style Reference: MapleStory Iconic Monster (Nexon 2D MMORPG). Aesthetics: Authentic 2D cute bouncy MMORPG monster pixel art. Charming squishy proportions, clean dark pixel outlines, expressive oversized eyes, pastel shading. ${sideScrollerCam}`;
             layoutIns = "Row 1: Idle (Breathing/Jiggling). Row 2: Walk/Hop/Trot. Row 3: High Bounce/Charge. Row 4: Attack (Tackle/Spore/Bite/Peck). Row 5: Special Monster Quirky Action. Row 6: Squish/Crouch. Row 7: Hurt/Impact. Row 8: Defeat (Poof/Pop/Drop). Row 9: Victory Hop/Cheer.";
        } else if (style.startsWith('maple-mount-') || style.startsWith('maple-turtle')) {
             styleIns = `Style Reference: MapleStory Iconic Mount & Vehicle (Nexon 2D MMORPG). Aesthetics: Authentic MapleStory mount pixel art designed for chibi rider characters. Distinctive vehicle/creature proportions, vibrant pastel mechanical & fantasy details, crisp dark pixel outlines. ${sideScrollerCam}`;
             layoutIns = "Row 1: Mount Idle (Breathing/Hover/Engine Idle). Row 2: Mount Trot/Drive/Glide Forward. Row 3: Full Speed Dash/Fly/Turbo. Row 4: Mount Jump/Leap/Altitude Boost. Row 5: Signature Mount Action/Attack/Horn. Row 6: Skidding Brake/Sudden Stop. Row 7: Hurt/Shudder. Row 8: Rest/Sit/Power Down. Row 9: Victory Roar/Cheer Hop.";
        } else if (style.startsWith('maple-pet-')) {
             styleIns = `Style Reference: MapleStory Iconic Pet & Companion (Nexon 2D MMORPG). Aesthetics: Ultra-adorable mini chibi pet companion pixel art. Tiny proportions, large glassy emotive eyes, sweet bouncy movement, clean dark pixel outlines. ${sideScrollerCam}`;
             layoutIns = "Row 1: Pet Idle (Bouncy breathing & ear/tail twitch). Row 2: Cute Trot/Waddle/Float. Row 3: Excited High Hop. Row 4: Pet Signature Trick/Playful Action. Row 5: Feed/Snack Munching. Row 6: Sit/Curl Up. Row 7: Cry/Shy Sweat Drop. Row 8: Sleep/Nap. Row 9: Level Up/Happy Dance Cheer.";
        } else if (style.startsWith('maple-morph-')) {
             styleIns = `Style Reference: MapleStory Magical Character Morph (Nexon 2D MMORPG). Aesthetics: Authentic magical transformation avatar pixel art. Playful costume/creature hybrid, clean stepped pixel dithering, vivid arcade colors. ${sideScrollerCam}`;
             layoutIns = "Row 1: Morph Idle (Breathing). Row 2: Morph Walk/Hop/Slide. Row 3: High Jump. Row 4: Morph Attack/Surprise Move. Row 5: Signature Morph Special. Row 6: Squat/Duck. Row 7: Hurt/Stun. Row 8: Poof/Vanish/Revert. Row 9: Victory Celebration.";
        } else if (style.startsWith('maple-body-')) {
             styleIns = `Style Reference: MapleStory Base Character Body & Skin (Nexon 2D MMORPG). Aesthetics: Pure authentic 2.5-head chibi character base body pixel art with customizable skin tone, pristine pixel contours, and classic MapleStory physics. ${sideScrollerCam}`;
             layoutIns = "Row 1: Stand/Bouncing Breath Idle. Row 2: Chibi Walk Cycle. Row 3: Sprint/Run with Arms Back. Row 4: Jump Up & Float Fall. Row 5: Punch Strike / Weapon Swing. Row 6: Prone/Crouch Down Flat. Row 7: Hurt/Hit Stun. Row 8: Tombstone Drop (Die). Row 9: Level Up Cheer Jump.";
        } else if (style.startsWith('maple-')) {
             styleIns = `Style Reference: MapleStory (Nexon 2D MMORPG). Aesthetics: Authentic 2D side-scrolling cute chibi MMORPG pixel art. 2.5-3 heads tall, large expressive anime eyes, stepped pixel shading, clean dark contours, vibrant pastel palette. ${sideScrollerCam}`;
             layoutIns = "Row 1: Idle (Cute breathing & bobbing). Row 2: Walk/Run. Row 3: Jump/Air float. Row 4: Basic Attack/Weapon Swing. Row 5: Skill Attack (Slash/Magic/Arrow/Flash Jump). Row 6: Prone/Crouch. Row 7: Hurt/Hit. Row 8: Tombstone (Die). Row 9: Level Up/Cheer Win.";
        } else if (style.startsWith('shantae-')) {
             styleIns = `Style Reference: Shantae and the Pirate's Curse (WayForward). Aesthetics: Fluid high-energy 16/32-bit anime pixel art. Crisp black contours, vibrant jewel tones, voluminous hair, dynamic combat posing. ${sideScrollerCam}`;
             layoutIns = "Row 1: Ready Stance (Breathing). Row 2: Run/Dash. Row 3: Jump/Somersault. Row 4: Hair Whip/Pistol Attack. Row 5: Pirate Gear Action (Hat Glide/Cannon/Scimitar). Row 6: Crouch/Slide. Row 7: Hurt/Impact. Row 8: Defeat. Row 9: Belly Dance/Victory.";
        } else if (style.startsWith('tarzan-')) {
             styleIns = `Style Reference: Disney's Tarzan (1999 Eurocom/Digital Eclipse). Aesthetics: 1999 late-90s platformer sprite art. Athletic fluid Disney animation silhouette, lush jungle palette (sepia, emerald greens, warm browns), warm rim lighting. ${sideScrollerCam}`;
             layoutIns = "Row 1: Jungle Alert Stance. Row 2: Jungle Sprint. Row 3: Jump/Tuck. Row 4: Spear Jab/Knife Slash. Row 5: Vine Swing/Tree Slide. Row 6: Crouch/Ground Slam. Row 7: Hurt/Stumble. Row 8: Fall/Defeat. Row 9: Chest Beat Yell/Victory.";
        } else if (style.startsWith('mrun-')) {
             styleIns = `Style Reference: Super Mario Run (Mobile). Aesthetics: Modern 3D characters rendered as 2D sprites. Vibrant, clean, rim lighting. Side view.`;
             layoutIns = "Row 1: Idle. Row 2: Run. Row 3: Jump. Row 4: Vault/Parkour. Row 5: Roll. Row 6: Wall Slide. Row 7: Spin. Row 8: Victory. Row 9: Bubble/Die.";
        } else if (style.startsWith('radv-')) {
             styleIns = `Style Reference: Rayman Adventures (UbiArt Framework). Aesthetics: Hand-drawn, painterly, expressive. Limbless characters (floating hands/feet). Fluid animation.`;
             layoutIns = "Row 1: Idle (Breathing). Row 2: Run. Row 3: Jump/Hover (Hair helicopter). Row 4: Punch/Slap. Row 5: Wall Run. Row 6: Swim. Row 7: Hurt. Row 8: Victory.";
        } else if (style.startsWith('aladdin-')) {
             styleIns = `Style Reference: Disney's Aladdin (Virgin Games/Genesis). Aesthetics: Digicel Process. Hand-drawn animation converted to sprite. Fluid, expressive, cartoon movement. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('lion-')) {
             styleIns = `Style Reference: The Lion King (Virgin Games). Aesthetics: Digicel Process. Realistic animal movement mixed with cartoon expression. Rich colors. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('mmania-')) {
             styleIns = `Style Reference: Mickey Mania. Aesthetics: 16-bit High Definition. Styles vary by level (Steamboat, Brave Tailor), but base is Classic Mickey. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('castle-')) {
             styleIns = `Style Reference: Castle of Illusion (SEGA). Aesthetics: 16-bit SEGA Genesis. Colorful, bouncy, slightly slower animation speed. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('world-')) {
             styleIns = `Style Reference: World of Illusion (SEGA). Aesthetics: 16-bit SEGA. Painted backgrounds, smooth magic animations. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('quack-')) {
             styleIns = `Style Reference: QuackShot Starring Donald Duck. Aesthetics: SEGA 16-bit. Indiana Jones style outfit. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('jungle-')) {
             styleIns = `Style Reference: The Jungle Book (Virgin Games). Aesthetics: Digicel/Hand-drawn sprites. Smooth walking cycles. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('garg-')) {
             styleIns = `Style Reference: Gargoyles (Genesis). Aesthetics: Dark, Gothic 16-bit. Detailed muscle definition and shading. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('toy-')) {
             styleIns = `Style Reference: Toy Story (SNES/Genesis). Aesthetics: Pre-rendered 3D sprites (ACM). Plastic texture look. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('tale-')) {
             styleIns = `Style Reference: TaleSpin (NES/Genesis). Aesthetics: Cartoon Pilot. Plane sprites for Baloo. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('ariel-')) {
             styleIns = `Style Reference: The Little Mermaid (Genesis/NES). Aesthetics: Underwater swimming physics. Flowing hair. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('belle-')) {
             styleIns = `Style Reference: Beauty and the Beast: Belle's Quest. Aesthetics: Bright colors, simple village look. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('roar-')) {
             styleIns = `Style Reference: Beauty and the Beast: Roar of the Beast. Aesthetics: Detailed, dark, hunched creature sprite. Gothic. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('tiny-')) {
             styleIns = `Style Reference: Tiny Toon Adventures (Buster's Hidden Treasure). Aesthetics: Konami 16-bit. Bright, fast, Sonic-like gameplay style. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('bat-')) {
             styleIns = `Style Reference: The Adventures of Batman & Robin (SEGA Genesis). Aesthetics: High contrast, technical shading, pseudo-3D effects. Dark deco style. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('tmnt-') && !style.includes('tf-')) {
             styleIns = `Style Reference: TMNT Hyperstone Heist. Aesthetics: Konami Arcade/Genesis style. Comic book outline. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('tj-')) {
             styleIns = `Style Reference: Tom and Jerry: Frantic Antics. Aesthetics: Small sprites, exaggerated damage animations. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('taz-')) {
             styleIns = `Style Reference: Taz-Mania (Genesis). Aesthetics: Warner Bros Animation. Spinning blur. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('dark-')) {
             styleIns = `Style Reference: The Pirates of Dark Water. Aesthetics: Detailed 16-bit Beat 'em up style. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('smurf-')) {
             styleIns = `Style Reference: The Smurfs (Infogrames). Aesthetics: European comic style 16-bit. Clean, flat colors. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else {
            // Fallback for previous IDs
            switch(style) {
                // --- CAPTAIN CLAW ---
                case 'claw-captain':
                    styleIns = `Style Reference: Captain Claw (Cat Pirate). Aesthetics: Monolith 1997 Style. High-quality hand-drawn pixel art. Detailed fur and clothes. Weapons: Sword, Pistol, Magic Claw. ${sideScrollerCam}`;
                    layoutIns = "Row 1: Idle. Row 2: Walk/Run. Row 3: Jump. Row 4: Sword Slash Combo. Row 5: Pistol Shot. Row 6: Magic Claw Attack. Row 7: Duck/Block. Row 8: Lift Object/Hurt. Row 9: Die.";
                    break;
                case 'claw-redtail':
                case 'claw-omar':
                case 'claw-officer':
                case 'claw-pirate':
                    styleIns = `Style Reference: Captain Claw Game Enemy (${style.replace('claw-', '')}). Aesthetics: Monolith 1997 Pixel Art. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;

                // --- METAL SLUG ANTHOLOGY ---
                case 'ms-marco':
                case 'ms-tarma':
                case 'ms-eri':
                case 'ms-fio':
                    styleIns = `Style Reference: Metal Slug Hero (${style.replace('ms-', '')}). Aesthetics: SNK NeoGeo Pixel Art. Detailed, gritty, expressive. Military vest. ${sideScrollerCam}`;
                    layoutIns = "Row 1: Idle (Pistol/Gun). Row 2: Run. Row 3: Shoot Up. Row 4: Shoot Down/Crouch. Row 5: Throw Grenade. Row 6: Knife Attack. Row 7: Look Up (Shocked). Row 8: Die/Skeleton.";
                    break;
                case 'ms-soldier':
                case 'ms-arabian':
                    styleIns = `Style Reference: Metal Slug Enemy (${style.replace('ms-', '')}). Aesthetics: SNK NeoGeo. Comical reactions. ${sideScrollerCam}`;
                    layoutIns = "Row 1: Idle. Row 2: Run/Panic. Row 3: Shoot Weapon. Row 4: Knife Slash. Row 5: Throw Grenade. Row 6: Shield Block. Row 7: Scream/Burn. Row 8: Die.";
                    break;
                case 'ms-mars':
                    styleIns = `Style Reference: Mars People (Alien). Aesthetics: Metal Slug Alien. Jellyfish-like, tentacles. ${sideScrollerCam}`;
                    layoutIns = "Row 1: Idle (Hover). Row 2: Teleport. Row 3: Shoot Ray Gun. Row 4: Spores. Row 5: Die (Green Splat).";
                    break;
                case 'ms-tank':
                    styleIns = `Style Reference: Metal Slug Tank (SV-001). Aesthetics: Super Deformed Tank. Bouncy animation. ${sideScrollerCam}`;
                    layoutIns = "Row 1: Idle (Tracks moving). Row 2: Move. Row 3: Main Cannon Fire. Row 4: Vulcan Fire. Row 5: Jump/Crouch. Row 6: Explode.";
                    break;

                // --- FIGHTING GAMES: STREET FIGHTER II ---
                case 'sf2-ryu':
                case 'sf2-ken':
                case 'sf2-honda':
                case 'sf2-chunli':
                case 'sf2-guile':
                case 'sf2-blanka':
                case 'sf2-zangief':
                case 'sf2-dhalsim':
                case 'sf2-balrog':
                case 'sf2-vega':
                case 'sf2-sagat':
                case 'sf2-bison':
                case 'sf2-cammy':
                case 'sf2-feilong':
                case 'sf2-deejay':
                case 'sf2-thawk':
                    styleIns = `Style Reference: Street Fighter II Turbo (${style.replace('sf2-', '')}). Aesthetics: Capcom 16-bit Pixel Art. Vibrant colors, thick limbs. ${fightCam}`;
                    layoutIns = fightingLayout;
                    break;

                // --- FIGHTING GAMES: MORTAL KOMBAT ---
                case 'mk-scorpion':
                case 'mk-subzero':
                case 'mk-raiden':
                case 'mk-liukang':
                case 'mk-johnny':
                case 'mk-sonya':
                case 'mk-kano':
                case 'mk-reptile':
                case 'mk-kitana':
                case 'mk-mileena':
                case 'mk-shang':
                case 'mk-goro':
                case 'mk-shao':
                case 'mk-motaro':
                    styleIns = `Style Reference: Mortal Kombat 3 (${style.replace('mk-', '')}). Aesthetics: Digitized actor sprites. Photorealistic but low-res grainy look. ${fightCam}`;
                    layoutIns = fightingLayout;
                    break;

                // --- FIGHTING GAMES: KILLER INSTINCT ---
                case 'ki-jago':
                case 'ki-fulgore':
                case 'ki-orchid':
                case 'ki-glacius':
                case 'ki-cinder':
                case 'ki-spinal':
                case 'ki-saber':
                case 'ki-riptor':
                case 'ki-tj':
                case 'ki-chief':
                case 'ki-eyedol':
                case 'ki-gargos':
                    styleIns = `Style Reference: Killer Instinct (${style.replace('ki-', '')}). Aesthetics: Pre-rendered 3D models converted to 2D sprites (Silicon Graphics). Dark, metallic look. ${fightCam}`;
                    layoutIns = fightingLayout;
                    break;

                // --- FIGHTING GAMES: TEKKEN 3 ---
                case 't3-jin':
                case 't3-hwoarang':
                case 't3-lei':
                case 't3-yoshi':
                case 't3-eddy':
                case 't3-law':
                case 't3-paul':
                case 't3-king':
                case 't3-xiaoyu':
                case 't3-nina':
                case 't3-ogre':
                case 't3-hei':
                case 't3-gon':
                case 't3-mokujin':
                    styleIns = `Style Reference: Tekken 3 (${style.replace('t3-', '')}). Aesthetics: PS1 Low Poly 3D Models rendered as 2D frames. Blocky limbs, Gouraud shading. ${fightCam}`;
                    layoutIns = fightingLayout;
                    break;

                // --- FIGHTING GAMES: STREET FIGHTER ALPHA 3 ---
                case 'sfa3-ryu':
                case 'sfa3-sakura':
                case 'sfa3-akuma':
                case 'sfa3-karin':
                case 'sfa3-cody':
                case 'sfa3-dan':
                case 'sfa3-rose':
                case 'sfa3-bison':
                    styleIns = `Style Reference: Street Fighter Alpha 3 (${style.replace('sfa3-', '')}). Aesthetics: Anime Style Pixel Art. Thick outlines, exaggerated hands/feet. ${fightCam}`;
                    layoutIns = fightingLayout;
                    break;

                // --- FIGHTING GAMES: MARVEL VS CAPCOM 2 ---
                case 'mvc2-ryu':
                case 'mvc2-wolvie':
                case 'mvc2-spidey':
                case 'mvc2-venom':
                case 'mvc2-cap':
                case 'mvc2-ironman':
                case 'mvc2-hulk':
                case 'mvc2-cable':
                case 'mvc2-storm':
                case 'mvc2-sentinel':
                case 'mvc2-magneto':
                case 'mvc2-morrigan':
                    styleIns = `Style Reference: Marvel vs. Capcom 2 (${style.replace('mvc2-', '')}). Aesthetics: High Resolution 2D Sprites. Comic book shading, flashy effects. ${fightCam}`;
                    layoutIns = fightingLayout;
                    break;

                // --- FIGHTING GAMES: SOULCALIBUR ---
                case 'sc-siegfried':
                case 'sc-nightmare':
                case 'sc-ivy':
                case 'sc-mitsurugi':
                case 'sc-taki':
                case 'sc-voldo':
                case 'sc-astaroth':
                case 'sc-cervantes':
                    styleIns = `Style Reference: Soulcalibur Dreamcast (${style.replace('sc-', '')}). Aesthetics: Smooth High-Poly 3D. Realistic textures. Weapon trails. ${fightCam}`;
                    layoutIns = fightingLayout;
                    break;

                // --- FIGHTING GAMES: SF3 3RD STRIKE ---
                case 'sf3-ryu':
                case 'sf3-chunli':
                case 'sf3-ken':
                case 'sf3-akuma':
                case 'sf3-alex':
                case 'sf3-dudley':
                case 'sf3-ibuki':
                case 'sf3-makoto':
                case 'sf3-q':
                case 'sf3-urien':
                case 'sf3-gill':
                    styleIns = `Style Reference: Street Fighter III: 3rd Strike (${style.replace('sf3-', '')}). Aesthetics: The pinnacle of 2D pixel art. Fluid animation, muted colors. ${fightCam}`;
                    layoutIns = fightingLayout;
                    break;

                // --- FIGHTING GAMES: DEAD OR ALIVE 2 ---
                case 'doa-kasumi':
                case 'doa-ryu':
                case 'doa-ayane':
                case 'doa-tina':
                case 'doa-zack':
                    styleIns = `Style Reference: Dead or Alive 2 (${style.replace('doa-', '')}). Aesthetics: Smooth 3D Anime style. Fast movement. ${fightCam}`;
                    layoutIns = fightingLayout;
                    break;

                // --- FIGHTING GAMES: SUPER SMASH BROS (N64) ---
                case 'ssb-mario':
                case 'ssb-link':
                case 'ssb-dk':
                case 'ssb-samus':
                case 'ssb-fox':
                case 'ssb-pika':
                case 'ssb-kirby':
                case 'ssb-yoshi':
                case 'ssb-falcon':
                case 'ssb-ness':
                case 'ssb-jiggly':
                case 'ssb-hand':
                    styleIns = `Style Reference: Super Smash Bros N64 (${style.replace('ssb-', '')}). Aesthetics: Simple Low Poly 3D. Cartoon textures. ${smashCam}`;
                    layoutIns = fightingLayout;
                    break;

                // --- FIGHTING GAMES: TMNT TOURNAMENT FIGHTERS ---
                case 'tmnt-tf-leo':
                case 'tmnt-tf-raph':
                case 'tmnt-tf-don':
                case 'tmnt-tf-mike':
                case 'tmnt-tf-aska':
                case 'tmnt-tf-chrome':
                case 'tmnt-tf-karai':
                    styleIns = `Style Reference: TMNT Tournament Fighters (${style.replace('tmnt-tf-', '')}). Aesthetics: Konami 16-bit. Detailed shading. ${fightCam}`;
                    layoutIns = fightingLayout;
                    break;

                // --- FIGHTING GAMES: ETERNAL CHAMPIONS ---
                case 'ec-shadow':
                case 'ec-xavier':
                case 'ec-trident':
                case 'ec-eternal':
                    styleIns = `Style Reference: Eternal Champions Sega Genesis (${style.replace('ec-', '')}). Aesthetics: Large sprites, dithering shading. ${fightCam}`;
                    layoutIns = fightingLayout;
                    break;

                // --- FIGHTING GAMES: NES KUNG FU ---
                case 'nes-kungfu-thomas':
                case 'nes-kungfu-x':
                case 'nes-yiear-oolong':
                case 'nes-karate':
                    styleIns = `Style Reference: NES 8-Bit Fighting Game. Aesthetics: Limited color palette (3-4 colors), blocky pixel art. Black background. ${sideScrollerCam}`;
                    layoutIns = fightingLayout;
                    break;

                // --- MEGA MAN X ---
                case 'mmx-x':
                    styleIns = `Style Reference: Mega Man X. Aesthetics: SNES 16-bit. Blue armor, arm cannon. Futuristic. ${sideScrollerCam}`;
                    layoutIns = "Row 1: Idle. Row 2: Run. Row 3: Dash (Thrusters). Row 4: Wall Slide. Row 5: Shoot Lemon. Row 6: Charge Shot. Row 7: Hurt. Row 8: Die (Orbs).";
                    break;
                case 'mmx-zero':
                    styleIns = `Style Reference: Zero (Mega Man X). Aesthetics: SNES 16-bit. Red armor, long blonde hair, Z-Saber. ${sideScrollerCam}`;
                    layoutIns = "Row 1: Idle. Row 2: Dash. Row 3: Saber Slash 1-2-3. Row 4: Wall Jump. Row 5: Buster Shot. Row 6: Teleport. Row 7: Hurt. Row 8: Die.";
                    break;
                case 'mmx-vile':
                    styleIns = `Style Reference: Vile (Boba Fett style robot). Aesthetics: Mega Man X Enemy. Purple armor, shoulder cannon. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;
                case 'mmx-sigma':
                    styleIns = "Style Reference: Sigma (Mega Man X). Cape, Saber, Tall. SNES 16-bit.";
                    layoutIns = standardPlatformerLayout;
                    break;

                // --- SONIC ---
                case 'sonic-sonic':
                    styleIns = `Style Reference: Sonic the Hedgehog (Genesis). Aesthetics: 16-bit SEGA. Blue, red shoes. No outlines. ${sideScrollerCam}`;
                    layoutIns = "Row 1: Idle (Tap foot). Row 2: Run (Wheel). Row 3: Spin Dash (Ball). Row 4: Spring Jump. Row 5: Skidding. Row 6: Push. Row 7: Hurt (Rings fly). Row 8: Die.";
                    break;
                case 'sonic-tails':
                case 'sonic-knuckles':
                case 'sonic-shadow':
                    styleIns = `Style Reference: Sonic Character (${style.replace('sonic-', '')}). Aesthetics: 16-bit SEGA Genesis. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;
                case 'sonic-eggman':
                    styleIns = `Style Reference: Dr. Robotnik (Eggman). Aesthetics: 16-bit SEGA. Round body, mustache, glasses. Usually in Eggmobile. ${sideScrollerCam}`;
                    layoutIns = "Row 1: Idle (in Ship). Row 2: Fly. Row 3: Laugh. Row 4: Hit (Charred). Row 5: Escape. Row 6: Panic.";
                    break;
                case 'sonic-motobug':
                    styleIns = "Style Reference: Motobug (Sonic Enemy). Robot Ladybug. SEGA Genesis.";
                    layoutIns = standardPlatformerLayout;
                    break;

                // --- MARIO ---
                case 'mario-mario':
                    styleIns = `Style Reference: Super Mario (World/All-Stars). Aesthetics: 16-bit Nintendo. Red hat, overalls, mustache. Colorful. ${sideScrollerCam}`;
                    layoutIns = "Row 1: Idle. Row 2: Run. Row 3: Jump. Row 4: Duck. Row 5: Look Up. Row 6: Throw Fireball. Row 7: Pipe Enter. Row 8: Die.";
                    break;
                case 'mario-bowser':
                    styleIns = `Style Reference: Bowser (King Koopa). Aesthetics: 16-bit Pixel Art. Spiked shell, horns, hair. Large sprite. ${sideScrollerCam}`;
                    layoutIns = "Row 1: Idle. Row 2: Walk (Stomp). Row 3: Fire Breath. Row 4: Jump (Shell spin). Row 5: Retreat in Shell. Row 6: Defeat.";
                    break;
                case 'mario-goomba':
                case 'mario-koopa':
                case 'mario-peach':
                case 'mario-luigi':
                    styleIns = `Style Reference: Super Mario Character (${style.replace('mario-', '')}). Aesthetics: SNES 16-bit. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;

                // --- PRINCE OF PERSIA (EXPANDED) ---
                case 'pop-classic':
                case 'pop-jaffar':
                    styleIns = `Style Reference: Prince of Persia (1989). Aesthetics: Rotoscoped Animation. Realistic fluid movement. Minimalist pixel art. ${sideScrollerCam}`;
                    layoutIns = "Row 1: Idle. Row 2: Run. Row 3: Careful Step. Row 4: Jump. Row 5: Climb Ledge. Row 6: Sword Parry. Row 7: Sword Strike. Row 8: Drink Potion. Row 9: Death.";
                    break;
                case 'pop-shadow':
                    styleIns = "Style Reference: The Shadow (Prince of Persia). Aesthetics: Semitransparent, dark silhouette, magical particles. Rotoscoped motion.";
                    layoutIns = standardPlatformerLayout;
                    break;
                case 'pop-sot':
                case 'pop-dahaka':
                    styleIns = `Style Reference: Prince of Persia Sands of Time (GBA/Console). Aesthetics: Detailed 2D pixel art. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;

                // --- CASTLEVANIA ---
                case 'cv-alucard':
                case 'cv-simon':
                case 'cv-dracula':
                case 'cv-skeleton':
                case 'cv-armor':
                    styleIns = `Style Reference: Castlevania SOTN Character (${style.replace('cv-', '')}). Aesthetics: Gothic Konami Pixel Art. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;

                // --- ADVENTURE ISLAND (RESTORED) ---
                case 'adv-higgins':
                    styleIns = `Style Reference: Master Higgins (Adventure Island). Aesthetics: Hudson Soft 8-bit/16-bit. Grass skirt, cap. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;
                case 'adv-tina':
                    styleIns = `Style Reference: Tina (Adventure Island). Aesthetics: Hudson Soft Anime style. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;
                case 'adv-boss':
                    styleIns = `Style Reference: Adventure Island Boss. Large sprite. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;

                // --- BOMBERMAN (RESTORED) ---
                case 'bomb-white':
                case 'bomb-black':
                    styleIns = `Style Reference: ${style === 'bomb-black' ? 'Black' : 'White'} Bomberman. Aesthetics: Hudson Soft Chibi Style. Shiny texture. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;
                case 'bomb-enemy':
                    styleIns = `Style Reference: Bomberman Enemy (Ballom). Aesthetics: Simple round shape. ${sideScrollerCam}`;
                    layoutIns = "Row 1: Float. Row 2: Squished.";
                    break;

                // --- DUCK HUNT (RESTORED) ---
                case 'duckhunt-dog':
                    styleIns = `Style Reference: Duck Hunt Dog. Aesthetics: NES Pixel Art. Snickering expression. ${sideScrollerCam}`;
                    layoutIns = "Row 1: Sniff. Row 2: Walk. Row 3: Jump into Grass. Row 4: Hold Duck (One). Row 5: Hold Duck (Two). Row 6: Laugh. Row 7: Surprise. Row 8: Hurt.";
                    break;
                case 'duckhunt-duck':
                    styleIns = `Style Reference: Duck Hunt Duck. Aesthetics: NES Pixel Art. 8-bit bird. ${sideScrollerCam}`;
                    layoutIns = "Row 1: Fly Horizontal. Row 2: Fly Diagonal. Row 3: Quack. Row 4: Shot/Fall. Row 5: Fly Away.";
                    break;

                // --- TOM & JERRY ---
                case 'tj-tom':
                case 'tj-jerry':
                case 'tj-spike':
                    styleIns = `Style Reference: Tom & Jerry (${style.replace('tj-', '')}). Aesthetics: 1950s MGM Cartoon. Clean lines, flat colors. EXTREME Squash and Stretch. ${sideScrollerCam}`;
                    layoutIns = "Row 1: Idle. Row 2: Sneak. Row 3: Chase Run. Row 4: Hit Reaction (Flattened). Row 5: Attack. Row 6: Shocked (Eyes pop). Row 7: Pain. Row 8: Burnt.";
                    break;

                // --- LOONEY TUNES (RESTORED) ---
                case 'tt-buster':
                case 'lt-bugs':
                case 'lt-taz':
                case 'lt-daffy':
                case 'lt-coyote':
                    styleIns = `Style Reference: Looney Tunes Character (${style.replace(/tt-|lt-/, '')}). Aesthetics: Warner Bros Animation. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;

                // --- ICE AGE (RESTORED) ---
                case 'ia-sid':
                case 'ia-manny':
                case 'ia-diego':
                case 'ia-scrat':
                case 'ia-buck':
                    styleIns = `Style Reference: Ice Age Character (${style.replace(/ia-/, '')}). Aesthetics: 2D adaptation of 3D movie character. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;
                
                // --- CRASH BANDICOOT ---
                case 'crash-crash':
                    styleIns = `Style Reference: Crash Bandicoot (PS1). Aesthetics: Low-poly 3D pre-rendered to 2D sprites. Orange fur, jeans, sneakers. ${crashCam}`;
                    layoutIns = "Row 1: Idle (Scratch head). Row 2: Run (Into screen). Row 3: Spin Attack. Row 4: Jump. Row 5: Slide. Row 6: Body Slam. Row 7: Wumpa Eat. Row 8: Angel Death.";
                    break;
                case 'crash-cortex':
                case 'crash-coco':
                case 'crash-lab':
                case 'crash-ngin':
                case 'crash-tiny':
                    styleIns = `Style Reference: Crash Bandicoot Character (${style.replace('crash-', '')}). Aesthetics: PS1 Low Poly Pre-rendered. ${crashCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;

                // --- RAYMAN ---
                case 'rayman-rayman':
                    styleIns = `Style Reference: Rayman (Original PS1). Aesthetics: Limbless character, floating hands/feet. Painterly 2D style. Big nose. ${sideScrollerCam}`;
                    layoutIns = "Row 1: Idle (Grimace). Row 2: Walk. Row 3: Helicopter Hair. Row 4: Wind-up Punch. Row 5: Throw Fist. Row 6: Hanging/Climbing. Row 7: Victory. Row 8: Hurt.";
                    break;
                case 'rayman-globox':
                case 'rayman-teensie':
                case 'rayman-hunter':
                case 'rayman-mr-dark':
                    styleIns = `Style Reference: Rayman Character (${style.replace('rayman-', '')}). Aesthetics: Painterly 2D style. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;

                // --- HERCULES ---
                case 'herc-hercules':
                case 'herc-hades':
                case 'herc-phil':
                case 'herc-hydra':
                    styleIns = `Style Reference: Hercules Game Character (${style.replace('herc-', '')}). Aesthetics: 2.5D Sprite, cel-shaded look. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;

                // --- THE MASK ---
                case 'mask-mask':
                case 'mask-milo':
                case 'mask-dorian':
                    styleIns = `Style Reference: The Mask SNES Character (${style.replace('mask-', '')}). Aesthetics: Zoot suit, elastic animation. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;

                // --- RACING (RESTORED) ---
                case 'racing-nfs':
                    styleIns = `Style Reference: Need for Speed / Realistic Racing. Aesthetics: Shiny metallic car sprite. ${racingCam}`;
                    layoutIns = standardRacingLayout;
                    break;
                case 'racing-mcqueen':
                    styleIns = `Style Reference: Lightning McQueen (Pixar Cars). Aesthetics: Cartoon Car with eyes on windshield. Red stock car. ${racingCam}`;
                    layoutIns = standardRacingLayout;
                    break;
                case 'racing-mini4wd':
                    styleIns = `Style Reference: Tamiya Mini 4WD (Bakusou Kyoudai Let's & Go). Aesthetics: Toy car, plastic texture, rollers. ${racingCam}`;
                    layoutIns = standardRacingLayout;
                    break;
                case 'racing-kart':
                    styleIns = `Style Reference: Go-Kart Racer. Aesthetics: Mario Kart style. ${racingCam}`;
                    layoutIns = standardRacingLayout;
                    break;

                // --- STRATEGY (RESTORED) ---
                case 'strat-aoe':
                case 'strat-stronghold':
                    styleIns = `Style Reference: RTS Unit (AoE/Stronghold). Aesthetics: Pre-rendered 3D sprite converted to 2D. Small scale. ${isometricCam}`;
                    layoutIns = standardIsometricLayout;
                    break;
                case 'strat-coc':
                    styleIns = `Style Reference: Clash of Clans Character. Aesthetics: Supercell Vector/3D Render style. Clean, colorful. ${isometricCam}`;
                    layoutIns = standardIsometricLayout;
                    break;
                case 'strat-civ':
                    styleIns = `Style Reference: Civilization Unit. Aesthetics: Realistic miniature. ${isometricCam}`;
                    layoutIns = standardIsometricLayout;
                    break;

                // --- JAZZ & EARTHWORM JIM ---
                case 'jazz-jazz':
                case 'jazz-spaz':
                case 'jazz-lori':
                case 'jazz-turtle':
                case 'jazz-devan':
                    styleIns = `Style Reference: Jazz Jackrabbit 2 Character. Aesthetics: 90s PC Platformer. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;
                case 'ewj-jim':
                case 'ewj-peter':
                case 'ewj-psycrow':
                case 'ewj-bob':
                case 'ewj-snot':
                    styleIns = `Style Reference: Earthworm Jim Character. Aesthetics: Grotesque 90s Cartoon. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;

                default:
                    // Fallback
                    styleIns = `Style Reference: ${style.replace(/-/g, ' ')}. Aesthetics: Classic Video Game. View: Side Profile.`;
                    layoutIns = standardPlatformerLayout;
                    break;
            }
        }

        // --- PROPORTION INSTRUCTIONS ---
        let propIns = "";
        switch (proportion) {
            case 'realistic':
                propIns = "PROPORTIONS: Realistic/Anatomically Correct (1:1). Head-to-body ratio must be natural.";
                break;
            case 'heroic':
                propIns = "PROPORTIONS: Heroic (1:4 to 1:5). Slightly larger head/hands/feet for readability.";
                break;
            case 'chibi':
                propIns = "PROPORTIONS: Chibi / Super Deformed (SD). Character MUST be 2 to 3 heads tall. Cute and stout.";
                break;
        }

        // --- RENDER STYLE INSTRUCTIONS ---
        let renderIns = "";
        switch (renderStyle) {
            case 'keep_original':
                renderIns = "RENDER STYLE: MATCH INPUT SOURCE EXACTLY. Use EXACTLY the same technique, line weight, shading, and color palette. Do not apply a new filter.";
                break;
            case 'pixel_retro':
                renderIns = "RENDER STYLE: Retro Pixel Art (8-bit/16-bit). Visible pixel grid. Sharp edges. No anti-aliasing.";
                break;
            case 'retro_pixar':
                renderIns = "RENDER STYLE: Retro-Pixar Mix (Pre-rendered 2.5D). Smooth 3D-style shading rendered as 2D sprite.";
                break;
            case 'ps1_retro':
                renderIns = "RENDER STYLE: PS1 Era Low Poly. Jagged polygon edges. Low resolution textures. Wobbly geometry.";
                break;
            case 'ps4_modern':
                renderIns = "RENDER STYLE: Modern PS4/PS5 High Fidelity. PBR textures, realistic lighting.";
                break;
            case 'modern_2d':
                renderIns = "RENDER STYLE: Modern 2D Vector/Hand-Drawn. Clean lines, cel-shaded.";
                break;
            case 'hand_drawn':
                renderIns = "RENDER STYLE: Traditional Hand Drawn. Sketchy pencil lines.";
                break;
        }
        
        // --- MODE LOGIC: STRICT vs STYLE vs CARICATURE ---
        let strictConstraint = "";
        if (generationMode === 'strict') {
             strictConstraint = `
             >>> CORE DIRECTIVE: IDENTITY CLONING <<<
             You are acting as a "Style Transfer" engine, not a "Character Creator".
             
             INPUT: The uploaded image contains the TARGET CHARACTER.
             STYLE REFERENCE: The text below describes an art style.
             
             ACTION:
             1. Take the person from the INPUT image.
             2. Keep their Face, Hair, Clothes, and Accessories EXACTLY as they are.
             3. Redraw them using the *technique* of the Style Reference (e.g., pixel art, shading).
             
             FORBIDDEN:
             - DO NOT change the person into the animal/creature mentioned in the style (unless they are already that animal).
             - DO NOT change their clothes to match the style character.
             - DO NOT change their face.
             - DO NOT generate a random character.
             
             If the input is a Human wearing a T-Shirt, the output MUST be that Human wearing that T-Shirt, but drawn in pixel art.
             ${IDENTITY_GUARD}
             `;
        } else if (generationMode === 'style') {
             strictConstraint = `
             MODE: GAME ART ADAPTER.
             1. Re-imagine the character specifically for the defined Game/Archetype.
             2. You may simplify details to fit the Render Style.
             `;
        } else if (generationMode === 'caricature') {
             strictConstraint = `
             MODE: CARICATURE.
             1. Exaggerate features based on the Proportion setting.
             2. Make the animation extremely bouncy and elastic.
             `;
        }

        // --- FINAL PROMPT ASSEMBLY ---
        let animationConstraint = "CRITICAL ANIMATION RULES: 1. Generate ALL 8-9 rows defined in the layout. 2. Ensure continuity. 3. Transparent background.";
        let finalLayoutIns = `Layout Grid: ${layoutIns}`;
        let promptTitle = "Generate a Professional Game Sprite Sheet.";

        if (isInPlaceAnimation) {
            promptTitle = "Convert the provided image into a full in-place character animation sequence for platform / side-scroller games.";
            strictConstraint += `
================================================
ABSOLUTE CHARACTER & WEAPON LOCK (NON-NEGOTIABLE)
================================================
Preserve the EXACT original character identity, silhouette, proportions, head-to-body ratio, facial structure, hairstyle, costume, accessories, and overall visual concept.
If the character is holding a weapon, preserve the EXACT weapon design, size, shape, and proportions.
No redesign. No reinterpretation. No added elements. No removed elements. No anatomy change. No proportion shift. No stylization change.
If any structural deviation occurs, the result is FAILED.
Maintain 100% identity consistency across all frames.
`;
            animationConstraint = `
================================================
POSITION LOCK (CRITICAL)
================================================
The character must remain in the EXACT SAME POSITION on screen for the entire animation.
No screen splitting. No grid layout. No sprite sheet panels. No camera movement. No zoom in or out. No reframing. No rotation. No perspective change.
Strict orthographic view. Static centered framing. Character must stay perfectly centered on the same fixed ground line.
If the character shifts even one pixel horizontally, the result is FAILED.
If scaling changes between frames, the result is FAILED.
If camera moves, the result is FAILED.
All animations must occur completely in-place.
`;
            finalLayoutIns = `
================================================
ANIMATION SEQUENCE
================================================
Perform the following actions sequentially in the SAME SPOT:
1. Idle loop (subtle breathing only)
2. Walk in place
3. Run in place
4. Jump straight up (vertical only) and land in the exact original position
5. Weapon-based Attack
6. Defensive stance
7. Block animation (if weapon allows)
8. Hurt reaction (slight pushback but return to exact original position)
9. Death animation

Jump must go vertically and land on the exact same ground position.
No forward movement. No backward movement. No drifting.

================================================
WEAPON-BASED INTELLIGENT COMBAT LOGIC
================================================
Automatically detect the weapon type and generate appropriate combat animations based on realistic combat mechanics.
• Sword / Blade → directional slashes, guard stance, parry motion, recoil after impact.
• Spear / Staff → thrust attack, extended reach pose, defensive brace stance.
• Heavy weapon (axe, hammer) → slow wind-up, heavy impact frame, strong recoil, visible weight shift.
• Gun / Ranged weapon → firing stance, recoil animation, reload animation, aiming stance.
• Magic staff / energy weapon → charge pose, casting frame, energy release, recovery frame.
• Shield → blocking stance, impact reaction, defensive push motion.

Weapon weight must affect animation speed.
Heavy weapons move slower with stronger anticipation.
Light weapons move faster with quick recovery.
Recoil must feel physically believable.

No lunging across the screen. No cinematic movement. No dynamic framing.

${additionalPrompt}
`;
        }

        // Order matters: Strict constraint first to prime the model
        const textPrompt = `${promptTitle}
        ${strictConstraint}
        
        ${styleIns}
        ${propIns}
        ${renderIns}
        
        ${finalLayoutIns}
        ${animationConstraint}`;
        
        const parts: Part[] = [imagePart, { text: textPrompt }];
        return callGeminiImage(parts);
    } catch (e: any) {
        throw new Error(e.message || "Failed to generate sprites");
    }
};


export const generateInPlaceVideo = async (
    imageFile: ImageFile,
    style: string = 'action-platformer',
    generationMode: 'strict' | 'style' | 'caricature' = 'strict',
    proportion: 'realistic' | 'heroic' | 'chibi' = 'heroic',
    renderStyle: 'keep_original' | 'pixel_retro' | 'modern_2d' | 'ps1_retro' | 'ps4_modern' | 'retro_pixar' | 'hand_drawn' = 'modern_2d',
    isInPlaceAnimation: boolean = true,
    additionalPrompt: string = ""
): Promise<string> => {
    try {
        const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || getApiKey();
        if (!apiKey) {
            throw new Error("API key is missing. Please select an API key or ensure the environment is configured.");
        }

        const base64Data = imageFile.base64 ? imageFile.base64.split(',')[1] : await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    const base64Part = reader.result.split(',')[1];
                    if (base64Part) {
                        resolve(base64Part);
                    } else {
                        reject(new Error("Failed to extract base64 data"));
                    }
                } else {
                    reject(new Error("Failed to read file as base64 string"));
                }
            };
            reader.onerror = () => reject(new Error("FileReader failed to read file"));
            reader.readAsDataURL(imageFile.file);
        });

        // We reuse the prompt logic from generateSpriteSheet but adapted for video
        let styleIns = "", layoutIns = "";

        // --- CAMERA DEFINITIONS ---
        const sideScrollerCam = "Camera Angle: STRICTLY Side-Scrolling 2.5D (Profile View). The character must face Left or Right.";
        const isometricCam = "Camera Angle: STRICTLY Isometric 2.5D (Clash of Clans style). View from a high, slanted angle (approx 45 degrees). Characters MUST face diagonally (South-East or South-West) on a grid.";
        const racingCam = "Camera Angle: STRICTLY Rear View (Third-Person Chase Camera). You are seeing the BACK of the vehicle.";
        const crashCam = "Camera Angle: 3rd Person Behind Back (Crash Bandicoot Style). Character runs INTO the screen.";
        const fightCam = "Camera Angle: Fighting Game Side View (Street Fighter/Tekken). Large characters, detailed stance. Ground level.";
        const smashCam = "Camera Angle: Distant Side View (Platform Fighter). Characters are smaller to fit screen.";

        // --- STANDARD LAYOUT TEMPLATES (Rows 1-8/9) ---
        const standardPlatformerLayout = "Row 1: Idle (Ready Stance, Breathing). Row 2: Walk (Exaggerated cycle). Row 3: Run (Fast/Smear frames). Row 4: Jump (Squash start, Stretch air, Squash land). Row 5: Attack (Wind-up, Strike, Follow-through). Row 6: Defend/Block. Row 7: Hurt/Damage (Impact distortion). Row 8: Die (Dramatic/Comical). Row 9: Special/Win.";
        const standardIsometricLayout = "Row 1: Idle (Ready). Row 2: Walk. Row 3: Run. Row 4: Attack 1. Row 5: Attack 2/Special. Row 6: Defend/Block. Row 7: Hurt. Row 8: Die. Row 9: Victory/Taunt.";
        const standardRacingLayout = "Row 1: Idle (Revving). Row 2: Drive (Straight). Row 3: Boost/Turbo (Fast). Row 4: Jump/Bounce. Row 5: Turn Left. Row 6: Turn Right. Row 7: Crash/Damage. Row 8: Wrecked/Die.";
        const fightingLayout = "Row 1: Stance (Breathing). Row 2: Walk Forward/Back. Row 3: Punch Combo. Row 4: Kick Combo. Row 5: Special Projectile/Move. Row 6: Anti-Air/Uppercut. Row 7: Block/Crouch. Row 8: Hit/Stun. Row 9: KO/Win.";

        // --- BUILD CHARACTER DEFINITION (styleIns) ---
        if (style.startsWith('maple-mushmom') || style.startsWith('maple-zakum') || style.startsWith('maple-pinkbean') || style.startsWith('maple-balrog') || style.startsWith('maple-horntail') || style.startsWith('maple-kingslime')) {
             styleIns = `Style Reference: MapleStory Iconic World Boss (Nexon 2D MMORPG). Aesthetics: Authentic 2D side-scrolling MapleStory epic Boss pixel art. Preserving the boss's iconic scale, cute yet menacing anime features, bold stepped pixel dithering, vibrant arcade color tones. ${sideScrollerCam}`;
             layoutIns = "Row 1: Idle (Menacing breath & float). Row 2: Walk/Hover. Row 3: Minor Attack/Charge. Row 4: Signature Ultimate Spell/Laser/Slam. Row 5: Area-of-Effect Hazard/Stomp. Row 6: Defensive Guard. Row 7: Hurt/Hit Stun. Row 8: Dramatic Boss Defeat/Explode. Row 9: Enrage/Roar.";
        } else if (style.startsWith('maple-mushroom') || style.startsWith('maple-slime') || style.startsWith('maple-ribbonpig') || style.startsWith('maple-wildboar') || style.startsWith('maple-evil-eye') || style.startsWith('maple-lupin') || style.startsWith('maple-pepe') || style.startsWith('maple-yeti')) {
             styleIns = `Style Reference: MapleStory Iconic Monster (Nexon 2D MMORPG). Aesthetics: Authentic 2D cute bouncy MMORPG monster pixel art. Charming squishy proportions, clean dark pixel outlines, expressive oversized eyes, pastel shading. ${sideScrollerCam}`;
             layoutIns = "Row 1: Idle (Breathing/Jiggling). Row 2: Walk/Hop/Trot. Row 3: High Bounce/Charge. Row 4: Attack (Tackle/Spore/Bite/Peck). Row 5: Special Monster Quirky Action. Row 6: Squish/Crouch. Row 7: Hurt/Impact. Row 8: Defeat (Poof/Pop/Drop). Row 9: Victory Hop/Cheer.";
        } else if (style.startsWith('maple-mount-') || style.startsWith('maple-turtle')) {
             styleIns = `Style Reference: MapleStory Iconic Mount & Vehicle (Nexon 2D MMORPG). Aesthetics: Authentic MapleStory mount pixel art designed for chibi rider characters. Distinctive vehicle/creature proportions, vibrant pastel mechanical & fantasy details, crisp dark pixel outlines. ${sideScrollerCam}`;
             layoutIns = "Row 1: Mount Idle (Breathing/Hover/Engine Idle). Row 2: Mount Trot/Drive/Glide Forward. Row 3: Full Speed Dash/Fly/Turbo. Row 4: Mount Jump/Leap/Altitude Boost. Row 5: Signature Mount Action/Attack/Horn. Row 6: Skidding Brake/Sudden Stop. Row 7: Hurt/Shudder. Row 8: Rest/Sit/Power Down. Row 9: Victory Roar/Cheer Hop.";
        } else if (style.startsWith('maple-pet-')) {
             styleIns = `Style Reference: MapleStory Iconic Pet & Companion (Nexon 2D MMORPG). Aesthetics: Ultra-adorable mini chibi pet companion pixel art. Tiny proportions, large glassy emotive eyes, sweet bouncy movement, clean dark pixel outlines. ${sideScrollerCam}`;
             layoutIns = "Row 1: Pet Idle (Bouncy breathing & ear/tail twitch). Row 2: Cute Trot/Waddle/Float. Row 3: Excited High Hop. Row 4: Pet Signature Trick/Playful Action. Row 5: Feed/Snack Munching. Row 6: Sit/Curl Up. Row 7: Cry/Shy Sweat Drop. Row 8: Sleep/Nap. Row 9: Level Up/Happy Dance Cheer.";
        } else if (style.startsWith('maple-morph-')) {
             styleIns = `Style Reference: MapleStory Magical Character Morph (Nexon 2D MMORPG). Aesthetics: Authentic magical transformation avatar pixel art. Playful costume/creature hybrid, clean stepped pixel dithering, vivid arcade colors. ${sideScrollerCam}`;
             layoutIns = "Row 1: Morph Idle (Breathing). Row 2: Morph Walk/Hop/Slide. Row 3: High Jump. Row 4: Morph Attack/Surprise Move. Row 5: Signature Morph Special. Row 6: Squat/Duck. Row 7: Hurt/Stun. Row 8: Poof/Vanish/Revert. Row 9: Victory Celebration.";
        } else if (style.startsWith('maple-body-')) {
             styleIns = `Style Reference: MapleStory Base Character Body & Skin (Nexon 2D MMORPG). Aesthetics: Pure authentic 2.5-head chibi character base body pixel art with customizable skin tone, pristine pixel contours, and classic MapleStory physics. ${sideScrollerCam}`;
             layoutIns = "Row 1: Stand/Bouncing Breath Idle. Row 2: Chibi Walk Cycle. Row 3: Sprint/Run with Arms Back. Row 4: Jump Up & Float Fall. Row 5: Punch Strike / Weapon Swing. Row 6: Prone/Crouch Down Flat. Row 7: Hurt/Hit Stun. Row 8: Tombstone Drop (Die). Row 9: Level Up Cheer Jump.";
        } else if (style.startsWith('maple-')) {
             styleIns = `Style Reference: MapleStory (Nexon 2D MMORPG). Aesthetics: Authentic 2D side-scrolling cute chibi MMORPG pixel art. 2.5-3 heads tall, large expressive anime eyes, stepped pixel shading, clean dark contours, vibrant pastel palette. ${sideScrollerCam}`;
             layoutIns = "Row 1: Idle (Cute breathing & bobbing). Row 2: Walk/Run. Row 3: Jump/Air float. Row 4: Basic Attack/Weapon Swing. Row 5: Skill Attack (Slash/Magic/Arrow/Flash Jump). Row 6: Prone/Crouch. Row 7: Hurt/Hit. Row 8: Tombstone (Die). Row 9: Level Up/Cheer Win.";
        } else if (style.startsWith('shantae-')) {
             styleIns = `Style Reference: Shantae and the Pirate's Curse (WayForward). Aesthetics: Fluid high-energy 16/32-bit anime pixel art. Crisp black contours, vibrant jewel tones, voluminous hair, dynamic combat posing. ${sideScrollerCam}`;
             layoutIns = "Row 1: Ready Stance (Breathing). Row 2: Run/Dash. Row 3: Jump/Somersault. Row 4: Hair Whip/Pistol Attack. Row 5: Pirate Gear Action (Hat Glide/Cannon/Scimitar). Row 6: Crouch/Slide. Row 7: Hurt/Impact. Row 8: Defeat. Row 9: Belly Dance/Victory.";
        } else if (style.startsWith('tarzan-')) {
             styleIns = `Style Reference: Disney's Tarzan (1999 Eurocom/Digital Eclipse). Aesthetics: 1999 late-90s platformer sprite art. Athletic fluid Disney animation silhouette, lush jungle palette (sepia, emerald greens, warm browns), warm rim lighting. ${sideScrollerCam}`;
             layoutIns = "Row 1: Jungle Alert Stance. Row 2: Jungle Sprint. Row 3: Jump/Tuck. Row 4: Spear Jab/Knife Slash. Row 5: Vine Swing/Tree Slide. Row 6: Crouch/Ground Slam. Row 7: Hurt/Stumble. Row 8: Fall/Defeat. Row 9: Chest Beat Yell/Victory.";
        } else if (style.startsWith('mrun-')) {
             styleIns = `Style Reference: Super Mario Run (Mobile). Aesthetics: Modern 3D characters rendered as 2D sprites. Vibrant, clean, rim lighting. Side view.`;
             layoutIns = "Row 1: Idle. Row 2: Run. Row 3: Jump. Row 4: Vault/Parkour. Row 5: Roll. Row 6: Wall Slide. Row 7: Spin. Row 8: Victory. Row 9: Bubble/Die.";
        } else if (style.startsWith('radv-')) {
             styleIns = `Style Reference: Rayman Adventures (UbiArt Framework). Aesthetics: Hand-drawn, painterly, expressive. Limbless characters (floating hands/feet). Fluid animation.`;
             layoutIns = "Row 1: Idle (Breathing). Row 2: Run. Row 3: Jump/Hover (Hair helicopter). Row 4: Punch/Slap. Row 5: Wall Run. Row 6: Swim. Row 7: Hurt. Row 8: Victory.";
        } else if (style.startsWith('aladdin-')) {
             styleIns = `Style Reference: Disney's Aladdin (Virgin Games/Genesis). Aesthetics: Digicel Process. Hand-drawn animation converted to sprite. Fluid, expressive, cartoon movement. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('lion-')) {
             styleIns = `Style Reference: The Lion King (Virgin Games). Aesthetics: Digicel Process. Realistic animal movement mixed with cartoon expression. Rich colors. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('mmania-')) {
             styleIns = `Style Reference: Mickey Mania. Aesthetics: 16-bit High Definition. Styles vary by level (Steamboat, Brave Tailor), but base is Classic Mickey. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('castle-')) {
             styleIns = `Style Reference: Castle of Illusion (SEGA). Aesthetics: 16-bit SEGA Genesis. Colorful, bouncy, slightly slower animation speed. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('world-')) {
             styleIns = `Style Reference: World of Illusion (SEGA). Aesthetics: 16-bit SEGA. Painted backgrounds, smooth magic animations. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('quack-')) {
             styleIns = `Style Reference: QuackShot Starring Donald Duck. Aesthetics: SEGA 16-bit. Indiana Jones style outfit. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('jungle-')) {
             styleIns = `Style Reference: The Jungle Book (Virgin Games). Aesthetics: Digicel/Hand-drawn sprites. Smooth walking cycles. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('garg-')) {
             styleIns = `Style Reference: Gargoyles (Genesis). Aesthetics: Dark, Gothic 16-bit. Detailed muscle definition and shading. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('toy-')) {
             styleIns = `Style Reference: Toy Story (SNES/Genesis). Aesthetics: Pre-rendered 3D sprites (ACM). Plastic texture look. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('tale-')) {
             styleIns = `Style Reference: TaleSpin (NES/Genesis). Aesthetics: Cartoon Pilot. Plane sprites for Baloo. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('ariel-')) {
             styleIns = `Style Reference: The Little Mermaid (Genesis/NES). Aesthetics: Underwater swimming physics. Flowing hair. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('belle-') || style.startsWith('roar-')) {
             styleIns = `Style Reference: Beauty and the Beast (Genesis/SNES). Aesthetics: 16-bit Disney style. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('tiny-')) {
             styleIns = `Style Reference: Tiny Toon Adventures (Genesis/SNES). Aesthetics: Fast, bouncy cartoon animation. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('bat-')) {
             styleIns = `Style Reference: The Adventures of Batman & Robin (Genesis). Aesthetics: Dark Deco, fluid animation, comic book style. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('tmnt-tf-')) {
             styleIns = `Style Reference: TMNT Tournament Fighters (${style.replace('tmnt-tf-', '')}). Aesthetics: Konami 16-bit. Detailed shading. ${fightCam}`;
             layoutIns = fightingLayout;
        } else if (style.startsWith('tmnt-')) {
             styleIns = `Style Reference: TMNT Hyperstone Heist/Turtles in Time. Aesthetics: 16-bit Arcade Beat 'em up. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('taz-')) {
             styleIns = `Style Reference: Taz-Mania (Genesis). Aesthetics: 16-bit cartoon. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('dark-')) {
             styleIns = `Style Reference: Pirates of Dark Water (SNES). Aesthetics: 16-bit Beat 'em up. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('smurf-')) {
             styleIns = `Style Reference: The Smurfs (16-bit). Aesthetics: Colorful European comic style. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('claw-')) {
             styleIns = `Style Reference: Captain Claw (1997). Aesthetics: High-res 2D PC platformer. Detailed cartoon sprites. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('jazz-')) {
             styleIns = `Style Reference: Jazz Jackrabbit 2. Aesthetics: Fast-paced 90s PC platformer. High-res pixel art. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('ewj-')) {
             styleIns = `Style Reference: Earthworm Jim. Aesthetics: Grotesque, highly detailed 16-bit animation. Fluid and bouncy. ${sideScrollerCam}`;
             layoutIns = standardPlatformerLayout;
        } else if (style.startsWith('strat-')) {
             styleIns = `Style Reference: Strategy Game Unit (${style.replace('strat-', '')}). Aesthetics: Small, readable sprites for RTS. ${isometricCam}`;
             layoutIns = standardIsometricLayout;
        } else if (style.startsWith('sf2-')) {
             styleIns = `Style Reference: Street Fighter II Turbo (${style.replace('sf2-', '')}). Aesthetics: Classic Capcom 16-bit fighting game. ${fightCam}`;
             layoutIns = fightingLayout;
        } else if (style.startsWith('mk-')) {
             styleIns = `Style Reference: Mortal Kombat Trilogy (${style.replace('mk-', '')}). Aesthetics: Digitized actors, photorealistic sprites. ${fightCam}`;
             layoutIns = fightingLayout;
        } else if (style.startsWith('ki-')) {
             styleIns = `Style Reference: Killer Instinct (${style.replace('ki-', '')}). Aesthetics: Pre-rendered 3D sprites (ACM), dark and gritty. ${fightCam}`;
             layoutIns = fightingLayout;
        } else if (style.startsWith('t3-')) {
             styleIns = `Style Reference: Tekken 3 (${style.replace('t3-', '')}). Aesthetics: PS1 3D fighting game. Blocky polygons, realistic textures. ${fightCam}`;
             layoutIns = fightingLayout;
        } else if (style.startsWith('sfa3-')) {
             styleIns = `Style Reference: Street Fighter Alpha 3 (${style.replace('sfa3-', '')}). Aesthetics: Anime Style Pixel Art. Thick outlines, exaggerated hands/feet. ${fightCam}`;
             layoutIns = fightingLayout;
        } else if (style.startsWith('mvc2-')) {
             styleIns = `Style Reference: Marvel vs. Capcom 2 (${style.replace('mvc2-', '')}). Aesthetics: High Resolution 2D Sprites. Comic book shading, flashy effects. ${fightCam}`;
             layoutIns = fightingLayout;
        } else if (style.startsWith('sc-')) {
             styleIns = `Style Reference: Soulcalibur Dreamcast (${style.replace('sc-', '')}). Aesthetics: Smooth High-Poly 3D. Realistic textures. Weapon trails. ${fightCam}`;
             layoutIns = fightingLayout;
        } else if (style.startsWith('sf3-')) {
             styleIns = `Style Reference: Street Fighter III: 3rd Strike (${style.replace('sf3-', '')}). Aesthetics: The pinnacle of 2D pixel art. Fluid animation, muted colors. ${fightCam}`;
             layoutIns = fightingLayout;
        } else if (style.startsWith('doa-')) {
             styleIns = `Style Reference: Dead or Alive 2 (${style.replace('doa-', '')}). Aesthetics: Smooth 3D Anime style. Fast movement. ${fightCam}`;
             layoutIns = fightingLayout;
        } else if (style.startsWith('ssb-')) {
             styleIns = `Style Reference: Super Smash Bros N64 (${style.replace('ssb-', '')}). Aesthetics: Simple Low Poly 3D. Cartoon textures. ${smashCam}`;
             layoutIns = fightingLayout;
        } else if (style.startsWith('ec-')) {
             styleIns = `Style Reference: Eternal Champions Sega Genesis (${style.replace('ec-', '')}). Aesthetics: Large sprites, dithering shading. ${fightCam}`;
             layoutIns = fightingLayout;
        } else if (style.startsWith('nes-kungfu-') || style.startsWith('nes-yiear-') || style.startsWith('nes-karate')) {
             styleIns = `Style Reference: NES 8-Bit Fighting Game. Aesthetics: Limited color palette (3-4 colors), blocky pixel art. Black background. ${sideScrollerCam}`;
             layoutIns = fightingLayout;
        } else {
            // Fallback to specific cases
            switch (style) {
                // --- BOMBERMAN (RESTORED) ---
                case 'bomb-white':
                case 'bomb-black':
                    styleIns = `Style Reference: ${style === 'bomb-black' ? 'Black' : 'White'} Bomberman. Aesthetics: Hudson Soft Chibi Style. Shiny texture. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;
                case 'bomb-enemy':
                    styleIns = `Style Reference: Bomberman Enemy (Ballom). Aesthetics: Simple round shape. ${sideScrollerCam}`;
                    layoutIns = "Row 1: Float. Row 2: Squished.";
                    break;

                // --- DUCK HUNT (RESTORED) ---
                case 'duckhunt-dog':
                    styleIns = `Style Reference: Duck Hunt Dog. Aesthetics: NES Pixel Art. Snickering expression. ${sideScrollerCam}`;
                    layoutIns = "Row 1: Sniff. Row 2: Walk. Row 3: Jump into Grass. Row 4: Hold Duck (One). Row 5: Hold Duck (Two). Row 6: Laugh. Row 7: Surprise. Row 8: Hurt.";
                    break;
                case 'duckhunt-duck':
                    styleIns = `Style Reference: Duck Hunt Duck. Aesthetics: NES Pixel Art. 8-bit bird. ${sideScrollerCam}`;
                    layoutIns = "Row 1: Fly Horizontal. Row 2: Fly Diagonal. Row 3: Quack. Row 4: Shot/Fall. Row 5: Fly Away.";
                    break;

                // --- TOM & JERRY ---
                case 'tj-tom':
                case 'tj-jerry':
                case 'tj-spike':
                    styleIns = `Style Reference: Tom & Jerry (${style.replace('tj-', '')}). Aesthetics: 1950s MGM Cartoon. Clean lines, flat colors. EXTREME Squash and Stretch. ${sideScrollerCam}`;
                    layoutIns = "Row 1: Idle. Row 2: Sneak. Row 3: Chase Run. Row 4: Hit Reaction (Flattened). Row 5: Attack. Row 6: Shocked (Eyes pop). Row 7: Pain. Row 8: Burnt.";
                    break;

                // --- LOONEY TUNES (RESTORED) ---
                case 'tt-buster':
                case 'lt-bugs':
                case 'lt-taz':
                case 'lt-daffy':
                case 'lt-coyote':
                    styleIns = `Style Reference: Looney Tunes Character (${style.replace(/tt-|lt-/, '')}). Aesthetics: Warner Bros Animation. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;

                // --- ICE AGE (RESTORED) ---
                case 'ia-sid':
                case 'ia-manny':
                case 'ia-diego':
                case 'ia-scrat':
                case 'ia-buck':
                    styleIns = `Style Reference: Ice Age Character (${style.replace(/ia-/, '')}). Aesthetics: 2D adaptation of 3D movie character. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;
                
                // --- CRASH BANDICOOT ---
                case 'crash-crash':
                    styleIns = `Style Reference: Crash Bandicoot (PS1). Aesthetics: Low-poly 3D pre-rendered to 2D sprites. Orange fur, jeans, sneakers. ${crashCam}`;
                    layoutIns = "Row 1: Idle (Scratch head). Row 2: Run (Into screen). Row 3: Spin Attack. Row 4: Jump. Row 5: Slide. Row 6: Body Slam. Row 7: Wumpa Eat. Row 8: Angel Death.";
                    break;
                case 'crash-cortex':
                case 'crash-coco':
                case 'crash-lab':
                case 'crash-ngin':
                case 'crash-tiny':
                    styleIns = `Style Reference: Crash Bandicoot Character (${style.replace('crash-', '')}). Aesthetics: PS1 Low Poly Pre-rendered. ${crashCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;

                // --- RAYMAN ---
                case 'rayman-rayman':
                    styleIns = `Style Reference: Rayman (Original PS1). Aesthetics: Limbless character, floating hands/feet. Painterly 2D style. Big nose. ${sideScrollerCam}`;
                    layoutIns = "Row 1: Idle (Grimace). Row 2: Walk. Row 3: Helicopter Hair. Row 4: Wind-up Punch. Row 5: Throw Fist. Row 6: Hanging/Climbing. Row 7: Victory. Row 8: Hurt.";
                    break;
                case 'rayman-globox':
                case 'rayman-teensie':
                case 'rayman-hunter':
                case 'rayman-mr-dark':
                    styleIns = `Style Reference: Rayman Character (${style.replace('rayman-', '')}). Aesthetics: Painterly 2D style. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;

                // --- HERCULES ---
                case 'herc-hercules':
                case 'herc-hades':
                case 'herc-phil':
                case 'herc-hydra':
                    styleIns = `Style Reference: Hercules Game Character (${style.replace('herc-', '')}). Aesthetics: 2.5D Sprite, cel-shaded look. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;

                // --- THE MASK ---
                case 'mask-mask':
                case 'mask-milo':
                case 'mask-dorian':
                    styleIns = `Style Reference: The Mask SNES Character (${style.replace('mask-', '')}). Aesthetics: Zoot suit, elastic animation. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;

                // --- RACING (RESTORED) ---
                case 'racing-nfs':
                    styleIns = `Style Reference: Need for Speed / Realistic Racing. Aesthetics: Shiny metallic car sprite. ${racingCam}`;
                    layoutIns = standardRacingLayout;
                    break;
                case 'racing-mcqueen':
                    styleIns = `Style Reference: Lightning McQueen. Aesthetics: Pixar Cars style. ${racingCam}`;
                    layoutIns = standardRacingLayout;
                    break;
                case 'racing-mini4wd':
                    styleIns = `Style Reference: Mini 4WD (Magnum Saber). Aesthetics: Anime racing style. ${racingCam}`;
                    layoutIns = standardRacingLayout;
                    break;
                case 'racing-kart':
                    styleIns = `Style Reference: Go-Kart. Aesthetics: Mario Kart style. ${racingCam}`;
                    layoutIns = standardRacingLayout;
                    break;

                // --- MEGA MAN X ---
                case 'mmx-x':
                    styleIns = `Style Reference: Mega Man X. Aesthetics: SNES 16-bit. Blue armor, arm cannon. Futuristic. ${sideScrollerCam}`;
                    layoutIns = "Row 1: Idle. Row 2: Run. Row 3: Dash (Thrusters). Row 4: Wall Slide. Row 5: Shoot Lemon. Row 6: Charge Shot. Row 7: Hurt. Row 8: Die (Orbs).";
                    break;
                case 'mmx-zero':
                    styleIns = `Style Reference: Zero (Mega Man X). Aesthetics: SNES 16-bit. Red armor, long blonde hair, Z-Saber. ${sideScrollerCam}`;
                    layoutIns = "Row 1: Idle. Row 2: Dash. Row 3: Saber Slash 1-2-3. Row 4: Wall Jump. Row 5: Buster Shot. Row 6: Teleport. Row 7: Hurt. Row 8: Die.";
                    break;
                case 'mmx-vile':
                    styleIns = `Style Reference: Vile (Boba Fett style robot). Aesthetics: Mega Man X Enemy. Purple armor, shoulder cannon. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;
                case 'mmx-sigma':
                    styleIns = "Style Reference: Sigma (Mega Man X). Cape, Saber, Tall. SNES 16-bit.";
                    layoutIns = standardPlatformerLayout;
                    break;

                // --- SONIC ---
                case 'sonic-sonic':
                    styleIns = `Style Reference: Sonic the Hedgehog (Genesis). Aesthetics: 16-bit SEGA. Blue, red shoes. No outlines. ${sideScrollerCam}`;
                    layoutIns = "Row 1: Idle (Tap foot). Row 2: Run (Wheel). Row 3: Spin Dash (Ball). Row 4: Spring Jump. Row 5: Skidding. Row 6: Push. Row 7: Hurt (Rings fly). Row 8: Die.";
                    break;
                case 'sonic-tails':
                case 'sonic-knuckles':
                case 'sonic-shadow':
                    styleIns = `Style Reference: Sonic Character (${style.replace('sonic-', '')}). Aesthetics: 16-bit SEGA Genesis. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;
                case 'sonic-eggman':
                    styleIns = `Style Reference: Dr. Robotnik (Eggman). Aesthetics: 16-bit SEGA. Round body, mustache, glasses. Usually in Eggmobile. ${sideScrollerCam}`;
                    layoutIns = "Row 1: Idle (in Ship). Row 2: Fly. Row 3: Laugh. Row 4: Hit (Charred). Row 5: Escape. Row 6: Panic.";
                    break;
                case 'sonic-motobug':
                    styleIns = "Style Reference: Motobug (Sonic Enemy). Robot Ladybug. SEGA Genesis.";
                    layoutIns = standardPlatformerLayout;
                    break;

                // --- MARIO ---
                case 'mario-mario':
                    styleIns = `Style Reference: Super Mario (World/All-Stars). Aesthetics: 16-bit Nintendo. Red hat, overalls, mustache. Colorful. ${sideScrollerCam}`;
                    layoutIns = "Row 1: Idle. Row 2: Run. Row 3: Jump. Row 4: Duck. Row 5: Look Up. Row 6: Throw Fireball. Row 7: Pipe Enter. Row 8: Die.";
                    break;
                case 'mario-bowser':
                    styleIns = `Style Reference: Bowser (King Koopa). Aesthetics: 16-bit Pixel Art. Spiked shell, horns, hair. Large sprite. ${sideScrollerCam}`;
                    layoutIns = "Row 1: Idle. Row 2: Walk (Stomp). Row 3: Fire Breath. Row 4: Jump (Shell spin). Row 5: Retreat in Shell. Row 6: Defeat.";
                    break;
                case 'mario-goomba':
                case 'mario-koopa':
                case 'mario-peach':
                case 'mario-luigi':
                    styleIns = `Style Reference: Super Mario Character (${style.replace('mario-', '')}). Aesthetics: SNES 16-bit. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;

                // --- PRINCE OF PERSIA (EXPANDED) ---
                case 'pop-classic':
                case 'pop-jaffar':
                    styleIns = `Style Reference: Prince of Persia (1989). Aesthetics: Rotoscoped Animation. Realistic fluid movement. Minimalist pixel art. ${sideScrollerCam}`;
                    layoutIns = "Row 1: Idle. Row 2: Run. Row 3: Careful Step. Row 4: Jump. Row 5: Climb Ledge. Row 6: Sword Parry. Row 7: Sword Strike. Row 8: Drink Potion. Row 9: Death.";
                    break;
                case 'pop-shadow':
                    styleIns = "Style Reference: The Shadow (Prince of Persia). Aesthetics: Semitransparent, dark silhouette, magical particles. Rotoscoped motion.";
                    layoutIns = standardPlatformerLayout;
                    break;
                case 'pop-sot':
                case 'pop-dahaka':
                    styleIns = `Style Reference: Prince of Persia Sands of Time (GBA/Console). Aesthetics: Detailed 2D pixel art. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;

                // --- CASTLEVANIA ---
                case 'cv-alucard':
                case 'cv-simon':
                case 'cv-dracula':
                case 'cv-skeleton':
                case 'cv-armor':
                    styleIns = `Style Reference: Castlevania SOTN Character (${style.replace('cv-', '')}). Aesthetics: Gothic Konami Pixel Art. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;

                // --- ADVENTURE ISLAND (RESTORED) ---
                case 'adv-higgins':
                    styleIns = `Style Reference: Master Higgins (Adventure Island). Aesthetics: Hudson Soft 8-bit/16-bit. Grass skirt, cap. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;
                case 'adv-tina':
                    styleIns = `Style Reference: Tina (Adventure Island). Aesthetics: Hudson Soft Anime style. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;
                case 'adv-boss':
                    styleIns = `Style Reference: Adventure Island Boss. Large sprite. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;

                // --- METAL SLUG ---
                case 'ms-marco':
                case 'ms-tarma':
                case 'ms-eri':
                case 'ms-fio':
                case 'ms-soldier':
                case 'ms-arabian':
                case 'ms-mars':
                case 'ms-tank':
                    styleIns = `Style Reference: Metal Slug (${style.replace('ms-', '')}). Aesthetics: Neo Geo Pixel Art. Extremely detailed, fluid, humorous animations. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;

                default:
                    styleIns = `Style Reference: ${style}. Aesthetics: 16-bit SNES/Genesis era. ${sideScrollerCam}`;
                    layoutIns = standardPlatformerLayout;
                    break;
            }
        }

        // --- PROPORTION INSTRUCTIONS ---
        let propIns = "";
        switch (proportion) {
            case 'realistic':
                propIns = "PROPORTIONS: Realistic/Anatomically Correct (1:1). Head-to-body ratio must be natural.";
                break;
            case 'heroic':
                propIns = "PROPORTIONS: Heroic (1:4 to 1:5). Slightly larger head/hands/feet for readability.";
                break;
            case 'chibi':
                propIns = "PROPORTIONS: Chibi / Super Deformed (SD). Character MUST be 2 to 3 heads tall. Cute and stout.";
                break;
        }

        // --- RENDER STYLE INSTRUCTIONS ---
        let renderIns = "";
        switch (renderStyle) {
            case 'keep_original':
                renderIns = "RENDER STYLE: MATCH INPUT SOURCE EXACTLY. Use EXACTLY the same technique, line weight, shading, and color palette. Do not apply a new filter.";
                break;
            case 'pixel_retro':
                renderIns = "RENDER STYLE: Retro Pixel Art (8-bit/16-bit). Visible pixel grid. Sharp edges. No anti-aliasing.";
                break;
            case 'retro_pixar':
                renderIns = "RENDER STYLE: Retro-Pixar Mix (Pre-rendered 2.5D). Smooth 3D-style shading rendered as 2D sprite.";
                break;
            case 'ps1_retro':
                renderIns = "RENDER STYLE: PS1 Era Low Poly. Jagged polygon edges. Low resolution textures. Wobbly geometry.";
                break;
            case 'ps4_modern':
                renderIns = "RENDER STYLE: Modern PS4/PS5 High Fidelity. PBR textures, realistic lighting.";
                break;
            case 'modern_2d':
                renderIns = "RENDER STYLE: Modern 2D Vector/Hand-Drawn. Clean lines, cel-shaded.";
                break;
            case 'hand_drawn':
                renderIns = "RENDER STYLE: Traditional Hand Drawn. Sketchy pencil lines.";
                break;
        }
        
        // --- MODE LOGIC: STRICT vs STYLE vs CARICATURE ---
        let strictConstraint = "";
        if (generationMode === 'strict') {
             strictConstraint = `
             >>> CORE DIRECTIVE: IDENTITY CLONING <<<
             You are acting as a "Style Transfer" engine, not a "Character Creator".
             
             INPUT: The uploaded image contains the TARGET CHARACTER.
             STYLE REFERENCE: The text below describes an art style.
             
             ACTION:
             1. Take the person from the INPUT image.
             2. Keep their Face, Hair, Clothes, and Accessories EXACTLY as they are.
             3. Redraw them using the *technique* of the Style Reference (e.g., pixel art, shading).
             
             FORBIDDEN:
             - DO NOT change the person into the animal/creature mentioned in the style (unless they are already that animal).
             - DO NOT change their clothes to match the style character.
             - DO NOT change their face.
             - DO NOT generate a random character.
             
             If the input is a Human wearing a T-Shirt, the output MUST be that Human wearing that T-Shirt, but drawn in pixel art.
             ${IDENTITY_GUARD}
             `;
        } else if (generationMode === 'style') {
             strictConstraint = `
             MODE: GAME ART ADAPTER.
             1. Re-imagine the character specifically for the defined Game/Archetype.
             2. You may simplify details to fit the Render Style.
             `;
        } else if (generationMode === 'caricature') {
             strictConstraint = `
             MODE: CARICATURE.
             1. Exaggerate features based on the Proportion setting.
             2. Make the animation extremely bouncy and elastic.
             `;
        }

        let promptTitle = "Convert the provided image into a full in-place character animation video for platform / side-scroller games.";
        strictConstraint += `
================================================
ABSOLUTE CHARACTER & WEAPON LOCK (NON-NEGOTIABLE)
================================================
Preserve the EXACT original character identity, silhouette, proportions, head-to-body ratio, facial structure, hairstyle, costume, accessories, and overall visual concept.
If the character is holding a weapon, preserve the EXACT weapon design, size, shape, and proportions.
No redesign. No reinterpretation. No added elements. No removed elements. No anatomy change. No proportion shift. No stylization change.
If any structural deviation occurs, the result is FAILED.
Maintain 100% identity consistency across all frames.
`;
        let animationConstraint = `
================================================
POSITION LOCK (CRITICAL)
================================================
The character must remain in the EXACT SAME POSITION on screen for the entire animation.
No camera movement. No zoom in or out. No reframing. No rotation. No perspective change.
Strict orthographic view. Static centered framing. Character must stay perfectly centered on the same fixed ground line.
If the character shifts even one pixel horizontally, the result is FAILED.
If scaling changes between frames, the result is FAILED.
If camera moves, the result is FAILED.
All animations must occur completely in-place.
`;
        let finalLayoutIns = `
================================================
ANIMATION SEQUENCE
================================================
Perform the following actions sequentially in the SAME SPOT:
1. Idle loop (subtle breathing only)
2. Walk in place
3. Run in place
4. Jump straight up (vertical only) and land in the exact original position
5. Weapon-based Attack
6. Defensive stance
7. Block animation (if weapon allows)
8. Hurt reaction (slight pushback but return to exact original position)
9. Death animation

Jump must go vertically and land on the exact same ground position.
No forward movement. No backward movement. No drifting.

================================================
WEAPON-BASED INTELLIGENT COMBAT LOGIC
================================================
Automatically detect the weapon type and generate appropriate combat animations based on realistic combat mechanics.
• Sword / Blade → directional slashes, guard stance, parry motion, recoil after impact.
• Spear / Staff → thrust attack, extended reach pose, defensive brace stance.
• Heavy weapon (axe, hammer) → slow wind-up, heavy impact frame, strong recoil, visible weight shift.
• Gun / Ranged weapon → firing stance, recoil animation, reload animation, aiming stance.
• Magic staff / energy weapon → charge pose, casting frame, energy release, recovery frame.
• Shield → blocking stance, impact reaction, defensive push motion.

Weapon weight must affect animation speed.
Heavy weapons move slower with stronger anticipation.
Light weapons move faster with quick recovery.
Recoil must feel physically believable.

No lunging across the screen. No cinematic movement. No dynamic framing.

${additionalPrompt}
`;

        const textPrompt = `Generate a high-quality 2x2 grid containing 4 sequential animation frames of this character performing: ${additionalPrompt || 'a dynamic action'}. 
        
        Grid Layout:
        - Top-Left: Frame 1 (Start/Idle)
        - Top-Right: Frame 2 (Anticipation/Build-up)
        - Bottom-Left: Frame 3 (Action Peak/Impact)
        - Bottom-Right: Frame 4 (Follow-through/End)

        CRITICAL INSTRUCTIONS:
        1. Character identity, clothing, facial features, and colors MUST be 100% identical across all 4 frames.
        2. The character MUST be perfectly centered in each grid cell.
        3. The character's size and scale MUST be consistent across all 4 frames.
        4. Use a pure white background for all frames.
        5. Style: ${styleIns}
        6. Proportions: ${propIns}
        7. Render Style: ${renderIns}
        
        Output a single square image containing this 2x2 grid.`;

        const imagePart = await imageToOptimizedGenerativePart(imageFile);
        const imageUrl = await callGeminiImage([imagePart, { text: textPrompt }], "1:1");

        // Create an animated GIF by slicing the 2x2 grid
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const frameCount = 4;
                const gridCols = 2;
                const gridRows = 2;
                
                // Each frame in the 2x2 grid
                const sourceFrameWidth = img.width / gridCols;
                const sourceFrameHeight = img.height / gridRows;

                // Output GIF dimensions (Square)
                canvas.width = 512;
                canvas.height = 512;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error("Canvas not supported"));

                const frames: string[] = [];
                
                // Extract each frame from the 2x2 grid
                for (let i = 0; i < frameCount; i++) {
                    const col = i % gridCols;
                    const row = Math.floor(i / gridCols);
                    
                    ctx.fillStyle = '#0f172a'; // Dark background for the game feel
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    // Calculate best fit for the frame in the 512x512 canvas
                    const scale = Math.min(canvas.width / sourceFrameWidth, canvas.height / sourceFrameHeight) * 0.95;
                    const drawW = sourceFrameWidth * scale;
                    const drawH = sourceFrameHeight * scale;
                    const drawX = (canvas.width - drawW) / 2;
                    const drawY = (canvas.height - drawH) / 2;

                    ctx.drawImage(
                        img, 
                        col * sourceFrameWidth, row * sourceFrameHeight, sourceFrameWidth, sourceFrameHeight, // Source
                        drawX, drawY, drawW, drawH // Destination
                    );
                    
                    frames.push(canvas.toDataURL('image/jpeg', 0.9));
                }

                // Create the GIF - Fallback to first frame to avoid gifshot fetch error
                console.warn("GIF creation bypassed to prevent fetch error.");
                resolve(frames[0]); 
                /*
                gifshot.createGIF({
                    images: frames,
                    gifWidth: 512,
                    gifHeight: 512,
                    interval: 0.2, 
                    numFrames: frameCount,
                    frameDuration: 1,
                    sampleInterval: 10,
                    repeat: 0
                }, (obj: any) => {
                    if (!obj.error) {
                        resolve(obj.image);
                    } else {
                        reject(new Error("Failed to compile animation grid"));
                    }
                });
                */
            };
            img.onerror = () => reject(new Error("Failed to process animation grid"));
            img.src = imageUrl;
        });

    } catch (e: any) {
        throw new Error(e.message || "Failed to generate video");
    }
};

export const generateVariationPrompts = async (filePart: any): Promise<string[]> => {
    if (!getApiKey() || useLocalEngine) {
        return [
            "Sci-fi astronaut suit redesign",
            "Steampunk explorer with brass and gears",
            "Fantasy RPG character",
            "Cyberpunk futuristic style",
            "1920s vintage detective aesthetic",
            "Royal court elegant attire",
            "Modern casual streetwear",
            "Magical wizard scholar robes",
            "Wild west cowboy gear",
            "Athletic sportswear outfit"
        ];
    }
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const prompt = `Analyze the attached image and generate exactly 10 distinct, creative redesigns (Variations). 
    CRITICAL INSTRUCTION: You MUST strictly maintain the original art style, artistic medium, and the core concept/proportions of the design. 
    Evolve the design by changing thematic elements (such as clothing, colors, genres, time periods, or elemental accents).
    SAFETY INSTRUCTION: Ensure all concepts are completely safe, family-friendly, and non-violent. Avoid terms like 'assassin', 'zombie', 'horror', 'weapons', or anything scary.
    Return the output STRICTLY as a JSON array of 10 strings, where each string is the detailed prompt for one variation. 
    Format:
    [
      "variation 1 description",
      "variation 2 description",
      ...
    ]`;
    const parts = [filePart, { text: prompt }];

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: { parts },
            config: {
                responseMimeType: "application/json",
            }
        });

        const text = response.text || "[]";
        const arr = JSON.parse(text);
        if (Array.isArray(arr) && arr.length > 0) return arr.slice(0, 10);
        return [];
    } catch (e) {
        console.error("Failed to parse variation prompts", e);
        return [];
    }
};

export const generateVariationImage = async (filePart: any, variationPrompt: string): Promise<string> => {
    const parts: any[] = [{ ...filePart }];
    parts.push({ text: `Redesign this character/image using this concept: "${variationPrompt}". Keep the original art style, body proportions, and aesthetic. Change the outfits, colors, and accessories to match the new concept. Use a clean background. Make sure the output is safe, non-scary, and family friendly.` });
    return callGeminiImage(parts);
};

export const convertToRetroCel = async (
    images: ImageFile[],
    preset: 'book_cafe' | 'village_low_angle' | 'muted_palette' | 'custom_template' | 'vintage_ink_paint',
    customParams?: {
        subject?: string;
        place?: string;
        color1?: string;
        color2?: string;
        vintageSubject?: string;
        vintageColors?: string;
        vintageAccessories?: string;
        vintagePatterns?: string;
        vintageBackground?: string;
    },
    keepBackground: boolean = true
): Promise<string> => {
    if (images.length === 0) throw new Error("Please upload at least one image.");

    const parts: Part[] = [];

    // Map each image file and add its inline data
    for (const image of images) {
        const base64Part = image.base64 ? image.base64.split(',')[1] : (await fileToGenerativePart(image.file)).inlineData?.data;
        if (base64Part) {
            parts.push({
                inlineData: {
                    data: base64Part,
                    mimeType: image.file.type,
                }
            });
        }
    }

    if (parts.length === 0) throw new Error("Failed to load image data.");

    let textPrompt = "";
    if (preset === 'book_cafe') {
        textPrompt = `A clean, hand-drawn retro cel animation keyframe based on the subject and scene in the uploaded image(s). The style is 1980s or 1990s traditional animation. The close-up portrait of the person / subject is rendered with clean, definitive black outlines and soft, muted, hand-painted flat colors. Every detail, such as the clothes, specific glasses or accessories, and pose, must be preserved but simplified. `;
        if (keepBackground) {
            textPrompt += `The background should preserve and adapt the original background scenes from the uploaded image(s), styled into a cozy, detailed, hand-painted illustrative cafe interior inside a retro television frame. `;
        } else {
            textPrompt += `The design must be presented without any background (isolated character). Place the subject/character on a completely plain, solid, pure white background for immediate isolated extraction. Do not generate any background scene, buildings, landscape, or cafe behind the subject. The backdrop must be pure solid white. `;
        }
        textPrompt += `The entire image has a pervasive soft film grain and a hand-made paper texture. Seek to retain the core anatomy and unique identity of the subject.`;
    } else if (preset === 'village_low_angle') {
        textPrompt = `A clean, hand-drawn retro cel animation keyframe based on the subject and scene in the uploaded image(s). The style is 1980s or 1990s traditional animation. The subject is rendered with clean, definitive black outlines and soft, muted, hand-painted flat colors. Every detail, such as the skin tone, specific pattern on the clothing, unique eye details, and any distinctive traits or jewelry, must be preserved but simplified. `;
        if (keepBackground) {
            textPrompt += `The background should preserve and adapt the original background scenery from the uploaded image(s) and simplify them into a detailed, hand-painted illustrative village environment inside a retro television frame or film strip, with a distinct, imperfect border. `;
        } else {
            textPrompt += `The design must be presented without any background (isolated character). Place the subject/character on a completely plain, solid, pure white background for immediate isolated extraction. Do not generate any background scene, buildings, village, film strip borders, or landscape behind the subject. The backdrop must be pure solid white. `;
        }
        textPrompt += `The overall composition is a low-angle shot looking up. The entire image has a pervasive soft film grain, a hand-made paper texture, and gentle, low-contrast lighting. Seek to retain the core anatomy and unique identity of the subject.`;
    } else if (preset === 'muted_palette') {
        textPrompt = `Retro cel animation Muted Palette Soft grain style conversion. Based on the subject in the uploaded image(s), render the character in an 1980s style with definitive outline cel lines, highly soft film grain, a hand-made paper texture, and an exquisite traditional animation palette. High-quality 1980s aesthetic. `;
        if (keepBackground) {
            textPrompt += `Preserve and transform the original background of the uploaded image(s), converting and hand-painting it to match the retro 1980s cel aesthetic. `;
        } else {
            textPrompt += `The design must be presented without any background. Place the subject/character on a completely plain, solid, pure white background for immediate isolated character extraction. `;
        }
    } else if (preset === 'vintage_ink_paint') {
        const vSubject = customParams?.vintageSubject || "a close-up portrait of a man with sunglasses";
        const vColors = customParams?.vintageColors || "soft, muted, hand-painted flat colors, like a muted navy blue shirt";
        const vAccessories = customParams?.vintageAccessories || "sunglasses";
        const vPatterns = customParams?.vintagePatterns || "specific shirt pattern";
        const vBackground = customParams?.vintageBackground || "a classic European street with cafes";

        textPrompt = `A pure vintage, hand-drawn retro cel animation keyframe. The style is traditional hand-inked and painted animation, focused on ${vSubject}, derived directly from the composition of the uploaded image(s). The character is rendered with clean, definitive black outlines and ${vColors}. The key ${vAccessories} and ${vPatterns} from the uploaded image(s) are preserved but simplified into clear, solid cel layers. `;
        if (keepBackground) {
            textPrompt += `The background must preserve and style the original background from the uploaded photo(s), or represent ${vBackground} styled matching the traditional background hand-painted feel, seamlessly integrated without any production paper textures. `;
        } else {
            textPrompt += `The scene must be presented without any background (isolated subject). The character must be placed alone on a completely plain, solid, pure white background. No background street, cafes, or objects should be generated behind the subject. `;
        }
        textPrompt += `The lighting is gentle and even, characteristic of classic hand-inked and painted animation, creating a soft, nostalgic glow over the entire animated field.`;
    } else {
        const subject = customParams?.subject || "character";
        const place = customParams?.place || "mysterious land";
        const color1 = customParams?.color1 || "pastel teal";
        const color2 = customParams?.color2 || "warm peach";
        textPrompt = `Retro cel animation style, a ${subject} based on the uploaded image(s). Render with visible cel lines, muted ${color1} and ${color2} palette, soft grain, gentle lighting, expressive character design, vintage animation frame aesthetic. `;
        if (keepBackground) {
            textPrompt += `Preserve and adapt the original background of the uploaded image(s), or use a hand-painted background representing ${place}. `;
        } else {
            textPrompt += `The design must be presented without any background. Place the subject/character on a completely plain, solid, pure white background for immediate isolated extraction. Do not generate any background scene, buildings, or place behind the subject. `;
        }
    }

    parts.push({ text: textPrompt });
    return callGeminiImage(parts);
};
