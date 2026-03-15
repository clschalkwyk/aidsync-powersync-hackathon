import { chat } from '@tanstack/ai'
import { geminiText } from '@tanstack/ai-gemini'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

export const isAiAvailable = () => !!GEMINI_API_KEY

export const getClinicalAssistant = () => {
  if (!GEMINI_API_KEY) {
    return null
  }

  return {
    chat: async ({ messages }: { messages: any[] }) => {
      const result = await chat({
        adapter: geminiText('gemini-2.0-flash'),
        messages
      })
      return result
    }
  }
}
