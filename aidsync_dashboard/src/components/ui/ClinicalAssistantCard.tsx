import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ShieldCheck, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { useClinicalAssistant } from '@/hooks/useClinicalAssistant'

interface ClinicalAssistantCardProps {
  context: string
  title: string
  label?: string
}

export function ClinicalAssistantCard({ context, title, label = "Clinical Assistant" }: ClinicalAssistantCardProps) {
  const { messages, isAvailable, isLoading, sendMessage, reset } = useClinicalAssistant()
  const [hasStarted, setHasStarted] = useState(false)

  const handleStart = () => {
    if (!isAvailable) return
    setHasStarted(true)
    sendMessage(`Analyze the following ${title} context and provide a concise clinical summary:\n\n${context}`)
  }

  const lastAssistantMessage = messages.filter(m => m.role === 'assistant').slice(-1)[0]

  return (
    <Card className="bg-clinical-900 border-none shadow-xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
        <ShieldCheck size={120} />
      </div>
      <CardHeader className="py-4 px-6 border-b border-white/5 bg-white/5">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-1.5 w-1.5 rounded-full ${isAvailable ? 'bg-brand-400 animate-pulse' : 'bg-clinical-600'}`} />
            {label}
          </div>
          {!isAvailable && (
            <span className="text-[8px] font-black bg-clinical-800 text-clinical-400 px-1.5 py-0.5 rounded border border-white/5">
              Configuration Required
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 relative z-10">
        {!isAvailable ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
              <AlertCircle className="h-4 w-4 text-clinical-500 shrink-0 mt-0.5" />
              <p className="text-[10px] font-medium text-clinical-400 leading-relaxed">
                The Intelligence Core requires a valid Gemini API key to provide clinical summaries. Please contact your system administrator to enable this feature.
              </p>
            </div>
            <Button 
              size="sm" 
              disabled
              className="w-full h-10 font-black text-[10px] uppercase tracking-widest bg-clinical-800 text-clinical-500 cursor-not-allowed border border-white/5"
            >
              Intelligence Core Disabled
            </Button>
          </div>
        ) : !hasStarted ? (
          <div className="space-y-4">
            <p className="text-[11px] text-clinical-400 leading-relaxed font-medium">
              Request a clinical safety summary and risk analysis for this {title}.
            </p>
            <Button 
              size="sm" 
              onClick={handleStart}
              className="w-full h-10 font-black text-[10px] uppercase tracking-widest bg-white text-clinical-900 hover:bg-brand-50 transition-all shadow-lg active:scale-95"
            >
              Analyze Reference
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {isLoading && !lastAssistantMessage && (
              <div className="flex items-center gap-3 text-clinical-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest">Synthesizing Insight...</span>
              </div>
            )}
            
            {lastAssistantMessage && (
              <div className="space-y-4">
                <div className="text-[12px] text-white leading-relaxed font-bold border-l-2 border-brand-400 pl-4 py-1">
                  {lastAssistantMessage.content}
                </div>
                <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleStart}
                    disabled={isLoading}
                    className="h-8 px-3 text-[9px] font-black uppercase tracking-widest text-clinical-400 hover:text-white hover:bg-white/10"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
                    Re-Analyze
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setHasStarted(false); reset(); }}
                    className="h-8 px-3 text-[9px] font-black uppercase tracking-widest text-clinical-400 hover:text-white hover:bg-white/10"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
