# TANSTACK_AI_PLAN.md

## Objective
Integrate TanStack AI to provide a "Clinical Assistant" in the AidSync Dashboard. This assistant will help clinicians and admins understand complex medication data and encounter outcomes without adding "flashy" visuals. It should feel like a "quietly technical" extension of the existing clinical audit trail.

## Features

### 1. Medication Clinical Insight
- **Context:** Active ingredients, linked interaction rules, and contraindications.
- **Functionality:** Provide a concise clinical summary of the medication's risk profile.
- **Placement:** A new "Intelligence" tab or a subtle card in `MedicationDetailPage`.

### 2. Encounter Audit Assistant
- **Context:** Patient vitals, clinician notes, and triggered safety alerts.
- **Functionality:** Summarize the "story" of the encounter and highlight potential follow-up needs.
- **Placement:** Enhance the existing `ai_summary` section in `EncounterDetailPage` to be interactive.

### 3. Global Clinical Chat (Optional/Stretch)
- A sidebar assistant that can query the medication catalog or encounter queue.

## Technical Strategy

### 1. Backend Integration (Edge Functions / API Routes)
- Since this is a Vite app, we'll need a way to run server-side logic for the LLM.
- If using Supabase, we can use Supabase Edge Functions.
- If we want to stay within the dashboard repo, we can use a small Express/Hono server or rely on client-side LLM calls if keys are managed securely (not recommended for production).
- **Decision:** Use a mock API route/simulated delay for the demo if a real backend isn't ready, or implement a Supabase Edge Function `ai-assistant`.

### 2. TanStack AI Setup
- Install `@tanstack/ai`, `@tanstack/ai-react`, and `@tanstack/ai-google-gemini`.
- Create `src/lib/ai.ts` to define the AI client and tools.

### 3. Isomorphic Tools
- `getMedicationContext`: Fetch ingredients and rules for a specific medication.
- `getEncounterContext`: Fetch vitals and checks for an encounter.

## Implementation Steps

### Phase 1: Setup
- [ ] Install dependencies.
- [ ] Create `src/lib/ai.ts` with basic configuration.
- [ ] Define the `useClinicalAssistant` hook.

### Phase 2: Medication Detail Enhancement
- [ ] Add `ClinicalAssistantCard` to `MedicationDetailPage`.
- [ ] Implement `getMedicationContext` tool.
- [ ] Add "Generate Clinical Summary" button (quietly technical).

### Phase 3: Encounter Detail Enhancement
- [ ] Add "Interactive Audit" mode to the AI summary section.
- [ ] Implement `getEncounterContext` tool.
- [ ] Allow asking follow-up questions like "What was the clinician's rationale for dismissing the red alert?".

## Design Principles
- **Color Palette:** Stick to `clinical` (gray), `brand` (blue/teal), and `safety` (red/yellow/green) scales.
- **Typography:** Use the same font-black uppercase tracking-widest for labels.
- **Interaction:** No chat bubbles. Use "Audit Narrative" or "Clinical Insights" as headers.
