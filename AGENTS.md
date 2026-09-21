# Character Workspace & AI Studio Guidelines (AGENTS.md)

This document contains a comprehensive prompt reference, active system directives, and a complete directory of features, tabs, and capabilities for the **Character Creator & Retro Cel Art Studio** application.

---

## 🤖 1. Assistant Identity & Core Directives (الهوية والتوجيهات الأساسية)
You are Google AI Studio's **AI Coding Agent**, a powerful agentic assistant designed to build, optimize, and scale this **Full-Stack Character Art Studio**. 

### 🎯 Scope Discipline (الانضباط في نطاق العمل)
*   **Respect User Intent Strictly**: Build exactly what the user described and requested. No unrequested secondary server routes, external API bloat, or UI clutter.
*   **Design-First Aesthetics**: Keep the app sleek, high-contrast, heavily premium-styled with slate-colored dark frames, elegant typography (Space Grotesk, Inter, and JetBrains Mono), and subtle dynamic transitions.
*   **No Technical Larping**: Never add simulated log terminals, fake port numbers, raw JSON dumps, or mock network status icons unless requested. Keep labels simple, humble, and beautifully human.

---

## 🎨 2. Active Application Features (دليل الأدوات والخصائص المفعلة)

Here is a full breakdown of every functional module currently active in this workspace, which you can modify, reference, or build upon:

### 1️⃣ Retro Cel Animator (`/components/RetroCelAnimation.tsx`)
Converts uploaded photos into breathtaking 1980s or 1990s traditional hand-inked cel animation frames. Highly tailored to subject identity.
*   **Cinematic Presets**:
    *   `Cafe Reading`: Coasts portraits inside a cozy, detailed painted retro TV frame.
    *   `Village Lookup`: Renders low-angle cinematic upward shots inside an imperfect film strip frame.
    *   `Cel Animation (Muted)`: Highlights classic expressive hand-cast outlines with highly muted watercolor palettes and soft grain.
    *   `Vintage Ink & Paint`: Translates pure traditional keyframes with black ink outlines, flat color washes, and ambient nostalgic streets.
    *   `Custom Prompt Formula Builder`: Dynamically maps customized variables `[Subject]`, `[Place]`, `[Color 1]`, and `[Color 2]` into traditional cel frameworks.
*   **Background Preservation Toggles**:
    *   **Use Original Background**: Preserves, adapts, and simplifies background structures directly from uploaded source files into the chosen art style.
    *   **No Background (Isolated)**: Generates character subjects alone on a completely pure, solid white backdrop for instant extracted use (بدون خلفية).

### 2️⃣ Design Variations Maker (`/components/DesignVariations.tsx`)
Utilizes Gemini to auto-generate 10 custom variation ideas, allowing rapid concept testing and dynamic variant rendering.

### 3️⃣ Aggressive Pixel Sprite ("Pixel Boss") (`/components/AggressivePixelSprite.tsx`)
Transforms photos into detailed 16-bit dithered video game boss structures with menacing, hyper-saturated outlines and compact chibi proportions.

### 4️⃣ Retro Pixel Sprite (`/components/RetroPixelSprite.tsx`)
Generates authentic 5-angle retro video game sprite sheets (Front, Back, Left, Right, 3/4) on isolated white backgrounds with dedicated game style presets:
*   **MapleStory (메이플스토리)**: Iconic 2.5-head chibi 2D MMORPG proportions, large expressive anime eyes, and clean pastel pixel line art.
*   **Shantae and the Pirate's Curse**: WayForward 16/32-bit high-energy fluid anime pixel aesthetic, razor-sharp black contours, and vivid jewel tones.
*   **Disney's Tarzan (1999)**: Eurocom/Digital Eclipse late-90s platformer sprites, athletic anatomy, lush jungle palette (sepia/emerald/mahogany), and dynamic keyframe stances.
*   **Classic 8/16-Bit**: Super Mario World & Adventure Island nostalgic platformer style.
*   **Metal Slug Arcade**: Neo Geo hyper-detailed military 2D pixel art with gritty dithering.
*   **Castlevania: Symphony of the Night**: 32-bit gothic dark fantasy RPG sprite art.
*   **Pokémon Gen 3 GBA**: Handheld GBA trainer/creature sprites.

### 5️⃣ Batch Processor (`/components/BatchProcessor.tsx`)
Allows users to upload multiple character designs, an entire folder, or a single sprite sheet (with automatic visual grid slicing into individual frames) and apply 'Retro Pixel' or 'Aggressive Pixel' ("Pixel Boss") transformations to all images at once with smart pacing, individual retry controls, ZIP export, and sprite sheet stitching.

### 6️⃣ Layer Composer (`/components/LayerComposer.tsx`)
Provides multi-layer alignment tools, blending controls, opacity options, and modular canvas exports for sequential image outputs.

### 7️⃣ Character Decomposer (`/components/CharacterDecomposer.tsx`)
Separates clothing, body, head textures, and custom accessory items in multi-slot modular grids for 2D/3D development preparation.

### 8️⃣ Sprite Sheet & Animation Sequence Maker (`/components/SpriteSheetMaker.tsx`)
Generates comprehensive multi-row animation sprite sheets and in-place animation sequences across an extensive roster of gaming universes:
*   **MapleStory: Monsters & Bosses (وحوش وزعماء مابل)**: Mushmom (머쉬맘), Zakum (8-Armed Boss), Pink Bean (핑크빈), Crimson Balrog (크림슨 발록), Horntail Dragon (혼테일), Yeti & Pepe (예티와 페페), King Slime (킹슬라임), Orange Mushroom (주황버섯), Green Slime, Ribbon Pig, Wild Boar, Evil Eye, Lupin, and Pepe.
*   **MapleStory: Mounts & Vehicles (مطايا ومركبات مابل)**: Red Draco (التنين الأحمر المجنح), Shinjou Pegasus (شينجو), Silver Mane (الخنزير المدرع), Frog Mount (الضفدع), Hot Air Balloon Bear (منطاد الدب), King Cro (التمساح الملكي), Yeti Mount (الييتي الضخم), Toy Tank (دبابة الألعاب), Blue Mecha Robot (الروبوت المقاتل), Ostrich (النعامة), Ram (الكبش), Turtle Mount (السلحفاة), Maple Racing Car (سيارة الفورمولا), Rocking Horse (الحصان الهزاز), Watch Hog (خنزير الحراسة), Mimiana & Mimio birds, and Magic Square (الكرة السحرية).
*   **MapleStory: Pets & Companions (حيوانات مابل الأليفة ومساعدي الأبطال)**: Black Dragon (التنين الأسود), Jr. Balrog (البالروغ الصغير), Jr. Reaper (حصاد الأرواح الصغير), Crystal Rudolph (غزال الكريستال), Dino Boy (الديناصور), Panda (الباندا), Sun Wu Kong (الملك القرد وو كونغ), Cloud Leopard (فهد السحاب), Kino Mushroom (فطر كينو), White Tiger (النمر الأبيض), Black Kitty (القطة السوداء), Blue Husky (كلب الهاسكي), Baby Elephant (الفيل الصغير), Gorilla Robo, Green Robo, Toucan (طائر الطوقان), White Bunny (الأرنب الأبيض), White Duck (البطة البيضاء), Snowman Pet (رجل الثلج), and Snail Pet (الحلزون الصغير).
*   **MapleStory: Morphs (تحولات ومسوخ مابل السحرية)**: Green Cornian Dragon, Barnard Grey Alien, Mystery Box, Orange Mushroom Morph, Red Snail Morph, and Ribbon Pig Morph.
*   **MapleStory: Base Bodies & Skins (أجسام وبشرات مابل الأساسية)**: Light, Dark, Pale, Tan, White, Yellow, Green, Blue, Red, and Gray Chibi Base Bodies with full canonical MapleStory physics (bouncing idle, walk, prone, tombstone, level up cheer).
*   **MapleStory: Heroes & Classes (أبطال وفئات مابل)**: Warrior/Hero, Magician/Bishop, Bowman/Archer, Thief/Assassin, and Pirate/Brawler with class-specific movesets (Slash, Flash Jump, Teleport, etc.).
*   **Shantae and the Pirate's Curse**: Shantae (Half-Genie), Risky Boots, Bolo, Sky & Wrench, Rottytops, and Tinkerbats with signature attacks (Hair Whip, Pistol, Cannon Jump, Hat Glide).
*   **Disney's Tarzan (1999 Platformer)**: Tarzan (Adult & Young), Terk, Tantor, Jane, Clayton, and Sabor Leopard with authentic late-90s platformer action keyframes.
*   **Extensive Classic Roster**: Super Mario Run, Rayman Adventures, Metal Slug Anthology, Sonic The Hedgehog, Disney 16-bit Classics, and more.

---

## 🛠️ 3. Prompt Persona & Task Guidelines (كيفية تعديل وتوجيه المساعد)

When issuing requests, you can reference this file directly. Any developer or creator using this workspace can ask the AI agent to:
1.  **Add a New Preset**: Provide instructions to modify the `PRESETS` array in `RetroCelAnimation.tsx` and map custom prompt variations inside `geminiService.ts`.
2.  **Modify Global Theme Styles**: Tweak local styles using utility Tailwind CSS parameters directly inside the core dashboard files.
3.  **Expand File Formats Or Storage**: Leverage the Firestore connection/database integration or create customized API pipelines.

---

*Document created locally in the root directory to persist system guidelines and maintain a clear, comprehensive map of the workspace properties.*
