# Paint Match AI

Local-first Progressive Web App for miniature painters, scale modelers, airbrush artists, and 3D-printing hobbyists.

Match any color from a photo or live camera using **only paints inside the selected palette**. Mixes never cross paint systems.

## Features

- Palette-scoped paint inventories (acrylic, lacquer, oil, automotive, etc.)
- Photo + live camera sampling with zoom, pan, magnifier, and averaging kernels
- CIELAB + CIEDE2000 mix optimizer (acrylic subtractive / additive modes)
- Mix history, projects, paint calculator, PNG/PDF export
- Offline PWA (IndexedDB + service worker)

## Stack

React · TypeScript · Vite · Tailwind CSS · TanStack Query · React Hook Form · Zod · Dexie · colorjs.io · vite-plugin-pwa

## Develop

```bash
npm install --legacy-peer-deps
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

Open on a phone (HTTPS or localhost) for camera access. Install from the browser for a home-screen app experience.
