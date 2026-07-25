# Paint Match AI — Design Spec

Date: 2026-07-25

## Overview

Paint Match AI is a local-first Progressive Web App that helps painters mix target colors from photos using only paints in a selected, compatible palette. No backend. All data stays on-device via IndexedDB.

## Goals

1. Sample a color from a photo or live camera.
2. Suggest an optimal mix from one selected palette only.
3. Optimize with CIELAB + CIEDE2000 (not RGB distance).
4. Work offline as an installable PWA on iPhone/Android/desktop.

## Architecture

```
UI (React + Tailwind + shadcn-style)
  → TanStack Query hooks
    → Dexie / IndexedDB
  → Mixing Engine (colorjs.io + combinatorial optimizer)
  → Camera / Canvas sampling
  → Export (PNG / PDF)
```

### Palette isolation (hard rule)

- Every paint belongs to exactly one palette.
- Mixing never crosses palettes.
- Match / Live flows require an active palette selection.

### Data model

- `Palette`: id, name, paintType, brand?, defaultThinner?, mixingNotes?, notes?, archived, createdAt, updatedAt
- `Paint`: id, paletteId, name, brand, finish, baseType, rgb, hex, lab?, notes?, createdAt, updatedAt
- `MixRecipe`: id, paletteId, projectId?, targetRgb/hex/lab, components[], deltaE, matchPercent, imageThumb?, notes?, favorite, createdAt
- `Project`: id, name, paletteId, notes, referenceImages[], recipeIds[], favoriteRecipeIds[], createdAt, updatedAt
- `AppSettings`: activePaletteId, maxPaints, averagingKernel, mixingMode, theme

### Mixing engine

1. Filter paints by selected palette; apply exclude/lock/opaque-priority rules.
2. Predict mix color via subtractive CMY blending (acrylic mode) or additive RGB (optional).
3. Search combinations up to `maxPaints` (2–5), seeded by nearest LAB candidates.
4. Optimize ratios; score with DeltaE2000; return percentages, drops, ml, weight, preview, DeltaE, match %.

### Primary screens (bottom nav)

1. **Match** — upload/capture → pan/zoom/magnifier → sample → recipe
2. **Live** — camera reticle → continuous mix updates
3. **Palettes** — CRUD palettes + paints (HEX/RGB/HSV/picker/camera/photo)
4. **History** — saved mixes, favorites, notes
5. **Projects** — palette-bound projects with refs + recipes

### Future AI seam

`src/ai/providers.ts` reserves adapters for brand conversion (Vallejo/Citadel/AK/Army Painter) and RAL/Pantone/NCS matching without wiring them yet.

## Tech stack

React, TypeScript, Vite, Tailwind CSS, shadcn-style UI, TanStack Query, React Hook Form, Zod, Dexie (IndexedDB), vite-plugin-pwa, Camera + Canvas APIs, colorjs.io.

## Non-goals (v1)

- Cloud sync / accounts
- Live brand catalog downloads
- Physical spectrophotometer hardware
