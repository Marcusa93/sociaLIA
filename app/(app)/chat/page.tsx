'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, Button, Spinner } from '@/components/ui'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const SUGGESTED_PROMPTS = [
  'Top 5 cuentas con más interacciones este mes',
  '¿Cuál es la concentración del ecosistema en Instagram?',
  '¿Qué tipologías predominan en TikTok?',
  'Mostrá la evolución de actividad en los últimos meses',
  '¿Cuántas cuentas tienen patrón de Coordinación?',
  '¿Cuál fue el mes con más interacciones totales?',
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hola, soy tu analista de ecosistemas digitales. Podés preguntarme sobre cuentas, interacciones, tipologías, concentración del ecosistema y más. ¿Qué querés saber?',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [useLLM, setUseLLM] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(query: string) {
    if (!query.trim() || loading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), useLLM }),
      })
      const { answer, error } = await res.json()

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: answer ?? error ?? 'Error al procesar la consulta.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Error de conexión. Por favor intentá de nuevo.',
        timestamp: new Date(),
      }])
    }

    setLoading(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Chat Analítico</h1>
          <p className="text-sm text-slate-400 mt-0.5">Consultá datos del ecosistema en lenguaje natural</p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-slate-400">Mejorar con LLM</span>
          <div
            onClick={() => setUseLLM(!useLLM)}
            className={`relative w-10 h-5 rounded-full transition-colors ${useLLM ? 'bg-brand-600' : 'bg-surface-border'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${useLLM ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </label>
      </div>

      {/* Messages */}
      <Card className="flex-1 overflow-y-auto p-4 mb-4">
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                  <svg className="w-3.5 h-3.5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10" />
                  </svg>
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-brand-600 text-white rounded-br-sm'
                  : 'bg-surface-tertiary border border-surface-border text-slate-300 rounded-bl-sm'
              }`}>
                <pre className="whitespace-pre-wrap font-sans leading-relaxed">{msg.content}</pre>
                <div className={`text-xs mt-1 ${msg.role === 'user' ? 'text-brand-200' : 'text-slate-500'}`}>
                  {msg.timestamp.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center mr-2 mt-0.5">
                <Spinner size="sm" />
              </div>
              <div className="bg-surface-tertiary border border-surface-border rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </Card>

      {/* Suggested prompts */}
      {messages.length <= 2 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map(prompt => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              className="text-xs bg-surface-secondary border border-surface-border text-slate-400 hover:text-white hover:border-brand-500/50 px-3 py-1.5 rounded-full transition-all"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit}>
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Preguntá sobre el ecosistema... (Enter para enviar, Shift+Enter para nueva línea)"
            className="flex-1 bg-surface-secondary border border-surface-border rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none h-12 max-h-32"
            rows={1}
            disabled={loading}
          />
          <Button type="submit" disabled={!input.trim() || loading} loading={loading} size="md">
            Enviar
          </Button>
        </div>
      </form>
    </div>
  )
}
