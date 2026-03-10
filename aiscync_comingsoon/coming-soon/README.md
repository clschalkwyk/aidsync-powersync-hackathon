# AidSync — Coming Soon (TanStack + Vinxi)

A SPA "coming soon" landing page for AidSync, built with **Vinxi** and **TanStack Router**.

## Stack

- **[Vinxi](https://vinxi.vercel.app/)** — Universal dev server and bundler
- **[TanStack Router](https://tanstack.com/router)** — Type-safe routing
- **[React](https://react.dev/)** — UI library
- **[TypeScript](https://www.typescriptlang.org/)** — Type safety
- **[Vite](https://vitejs.dev/)** — Build tool

## Design Philosophy

Following AidSync's brand guidelines:

- **Calm utility**: Whitespace, clear grouping, low visual clutter
- **Information hierarchy first**: Easy to scan content
- **Mobile-first**: Large tap targets, fast flows
- **Clinical but human**: Serious without being intimidating
- **Offline-first theme**: Visual sync indicators, local-first messaging

## Brand Colors

- **Background**: `#fafaf9` (warm off-white)
- **Text**: `#1c1917` (dark slate)
- **Accent**: `#0d9488` (teal)
- **Safety colors**:
  - Green (`#16a34a`): Safe / no issue
  - Amber (`#d97706`): Caution / review
  - Red (`#dc2626`): Serious warning

## Project Structure

```
coming-soon/
├── src/
│   ├── components/
│   │   └── index.tsx      # All React components
│   ├── routes/
│   │   ├── __root.tsx     # Root layout
│   │   └── index.tsx      # Home page
│   ├── styles/
│   │   └── app.css        # All styles
│   ├── client.tsx         # Client entry
│   ├── router.tsx         # Router configuration
│   └── routeTree.gen.ts   # Generated route tree
├── public/
│   └── favicon.svg        # AidSync favicon
├── index.html             # HTML entry
├── app.config.ts          # Vinxi config
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
└── README.md              # This file
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm

### Installation

```bash
# Navigate to the project
cd aiscync_comingsoon/coming-soon

# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Build for Production

```bash
npm run build
```

Output will be in `.output/public/`.

### Preview Production Build

```bash
node .output/server/index.mjs
```

## Features

- **Hero section**: Animated device mockup showing the AidSync interface
- **Problem statement**: Why offline-first matters
- **Workflow steps**: 6-step process visualization
- **Features grid**: 6 key capabilities
- **Target users**: Clinician personas
- **Early access form**: Email signup with validation
- **FAQ accordion**: Common questions
- **Footer**: Links and tech stack attribution

## Deployment

The build output in `.output/public/` is a static site that can be deployed to any static host:

- **Vercel**: `vercel --prod`
- **Netlify**: Drag and drop `.output/public/`
- **GitHub Pages**: Copy `.output/public/` contents
- **Cloudflare Pages**: Upload `.output/public/`

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari/Chrome

## Accessibility

- Semantic HTML5 structure
- ARIA labels for navigation
- Keyboard navigable
- Focus states on interactive elements
- Reduced motion support
- High contrast text

## License

Part of the AidSync project.
