# TanStack AI Implementation Steps

## 1. Installation
Install core packages and the OpenAI adapter (or Gemini if preferred, but OpenAI is standard in many examples).
```bash
npm install @tanstack/ai @tanstack/ai-react zod
# Choose one or more adapters:
# npm install @tanstack/ai-openai
# npm install @tanstack/ai-google-gemini
```

## 2. Server-Side Setup
Create an API route to handle chat completions.

```typescript
// src/lib/ai.ts (Shared logic)
import { chat } from '@tanstack/ai';
import { google } from '@tanstack/ai-google-gemini'; // Example using Gemini

export const aiChat = (messages: any[]) => chat({
  adapter: google(),
  model: 'gemini-1.5-pro',
  messages,
});
```

## 3. Client-Side Hook Usage
Integrate the `useChat` hook in your components.

```tsx
import { useChat } from '@tanstack/ai-react';

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat', // Endpoint where aiChat is called
  });
  // ... render messages and form
}
```

## 4. Defining Tools (Isomorphic)
Define tools that can run on server or client.

```typescript
import { toolDefinition } from '@tanstack/ai';
import { z } from 'zod';

export const getPatientInfo = toolDefinition({
  id: 'get-patient-info',
  description: 'Retrieve patient details from the database',
  input: z.object({ patientId: z.string() }),
}).server(async ({ input }) => {
  // Database lookup logic
});
```
