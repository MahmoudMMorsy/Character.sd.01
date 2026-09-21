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
Generates highly retro 8-bit or 16-bit character sprite sheets featuring 5 distinct angles (facing front, back, profile, 3/4) on solid isolated backgrounds.

### 5️⃣ Layer Composer (`/components/LayerComposer.tsx`)
Provides multi-layer alignment tools, blending controls, opacity options, and modular canvas exports for sequential image outputs.

### 6️⃣ Character Decomposer (`/components/CharacterDecomposer.tsx`)
Separates clothing, body, head textures, and custom accessory items in multi-slot modular grids for 2D/3D development preparation.

---

## 🛠️ 3. Prompt Persona & Task Guidelines (كيفية تعديل وتوجيه المساعد)

When issuing requests, you can reference this file directly. Any developer or creator using this workspace can ask the AI agent to:
1.  **Add a New Preset**: Provide instructions to modify the `PRESETS` array in `RetroCelAnimation.tsx` and map custom prompt variations inside `geminiService.ts`.
2.  **Modify Global Theme Styles**: Tweak local styles using utility Tailwind CSS parameters directly inside the core dashboard files.
3.  **Expand File Formats Or Storage**: Leverage the Firestore connection/database integration or create customized API pipelines.

---

*Document created locally in the root directory to persist system guidelines and maintain a clear, comprehensive map of the workspace properties.*
