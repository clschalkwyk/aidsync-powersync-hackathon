# AidSync Dashboard

The online medication reference preparation, review, and audit surface for AidSync.

## Overview

This dashboard serves as the online surface for:

1. **Medication Reference Preparation** - Ingest and normalize medication leaflet/reference data
2. **Review/Publish Workflows** - Review and approve medication safety fields
3. **Encounter Review** - Review synced encounter outcomes from field devices
4. **PowerSync Demo Support** - Visualize the sync flow between dashboard and field devices

## Tech Stack

- **React** - UI framework
- **TanStack Router** - File-based routing
- **TanStack Query** - Server state management
- **TanStack Table** - Data tables
- **Tailwind CSS** - Styling
- **Supabase JS** - Backend client

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase project (local or cloud)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

### Environment Variables

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

## Project Structure

```
aidsync_dashboard/
├── src/
│   ├── components/        # React components
│   │   ├── layout/        # Layout components (Sidebar, Header)
│   │   └── ui/            # UI components (Button, Card, etc.)
│   ├── data/              # Data layer (queries)
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities and clients
│   ├── routes/            # TanStack Router routes
│   │   ├── _authenticated/  # Protected routes
│   │   ├── login.tsx        # Login page
│   │   └── index.tsx        # Root redirect
│   ├── types/             # TypeScript types
│   ├── index.css          # Global styles
│   ├── main.tsx           # App entry point
│   └── routeTree.gen.ts   # Generated route tree
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## Routes

| Route | Description |
|-------|-------------|
| `/login` | Authentication page |
| `/overview` | Dashboard overview with counts |
| `/medications` | Medication catalog list |
| `/medications/:id` | Medication detail |
| `/patients` | Patient list |
| `/patients/:id` | Patient detail |
| `/encounters` | Encounter list |
| `/encounters/:id` | Encounter detail |
| `/interactions` | Interaction rules |
| `/contraindications` | Contraindication rules |

## Database Schema

The dashboard uses the same Supabase schema as the mobile app:

**Reference Tables:**
- `active_ingredients` - Active pharmaceutical ingredients
- `medication_catalog` - Medication reference data
- `medication_catalog_ingredients` - Link table
- `medication_interaction_rules` - Drug interaction rules
- `medication_contraindication_rules` - Contraindication rules

**Clinical Tables:**
- `patients` - Patient records
- `patient_allergies` - Allergy records
- `patient_conditions` - Medical conditions
- `current_medications` - Current medications
- `encounters` - Care sessions
- `vitals` - Vital signs
- `interaction_checks` - Safety check results

## Demo Flow

The dashboard supports the following PowerSync demonstration workflow:

1. **Prepare** - Medication reference data is prepared online in the dashboard
2. **Sync** - Data syncs to field devices through PowerSync
3. **Check** - Clinicians use synced data for offline safety checks
4. **Record** - Encounter outcomes are recorded locally
5. **Sync back** - Results sync back when connectivity returns for review

## Development

For the shortest working setup path, see [SETUP_AND_TEST.md](./SETUP_AND_TEST.md).

### Adding a New Route

1. Create a new file in `src/routes/` following the TanStack Router file-based routing convention
2. Export a `Route` component using `createFileRoute()`
3. The route tree will be auto-generated

### Adding a New Query

1. Add the query function to `src/data/queries.ts`
2. Use TanStack Query's `useQuery` hook in your component
3. Types are derived from the database schema in `src/types/database.ts`

## License

Part of the AidSync hackathon project.
