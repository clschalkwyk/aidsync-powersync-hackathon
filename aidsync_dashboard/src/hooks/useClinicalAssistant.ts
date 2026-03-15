import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { getClinicalAssistant } from '@/lib/ai'

export type Message = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export function useClinicalAssistant() {
  const [messages, setMessages] = useState<Message[]>([])
  const assistant = getClinicalAssistant()

  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      if (!assistant) {
        throw new Error('Clinical Assistant is currently unavailable (API key missing).')
      }

      const newMessages: Message[] = [
        ...messages,
        { role: 'user', content: userMessage }
      ]
      
      setMessages(newMessages)
      
      const response = await assistant.chat({ messages: newMessages })
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.content || 'No response from assistant.'
      }
      
      setMessages([...newMessages, assistantMessage])
      return assistantMessage
    }
  })

  const reset = () => setMessages([])

  return {
    messages,
    isAvailable: !!assistant,
    isLoading: chatMutation.isPending,
    error: chatMutation.error,
    sendMessage: chatMutation.mutate,
    reset
  }
}
