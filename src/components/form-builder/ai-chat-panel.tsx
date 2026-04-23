"use client"

import { useState, useRef, useEffect, useTransition } from "react"
import { Sparkles, Send, Loader2, X, Bot, User } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { chatWithFormAI, type ChatMessage, type ChatSettingsUpdate } from "@/lib/actions/ai"
import type { FieldConfig, ApprovalWorkflow } from "@/lib/types"

interface AiChatPanelProps {
  open: boolean
  onClose: () => void
  fields: FieldConfig[]
  onFieldsUpdate: (fields: FieldConfig[]) => void
  onSettingsUpdate?: (updates: ChatSettingsUpdate) => void
  onApprovalStepsUpdate?: (steps: ApprovalWorkflow["steps"] | null) => void
}

interface DisplayMessage {
  role: "user" | "assistant"
  content: string
  summary?: string[]
}

export function AiChatPanel({ open, onClose, fields, onFieldsUpdate, onSettingsUpdate, onApprovalStepsUpdate }: AiChatPanelProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isPending, startTransition] = useTransition()
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  function handleSend() {
    const text = input.trim()
    if (!text || isPending) return

    setMessages((prev) => [...prev, { role: "user", content: text }])
    setInput("")

    startTransition(async () => {
      const result = await chatWithFormAI({
        message: text,
        currentFields: fields,
        history,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      setHistory(result.history)

      if (result.summary.length > 0) {
        onFieldsUpdate(result.fields)
      }
      if (result.settings && onSettingsUpdate) {
        onSettingsUpdate(result.settings)
      }
      if (result.approvalSteps !== undefined && onApprovalStepsUpdate) {
        onApprovalStepsUpdate(result.approvalSteps)
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.aiMessage,
          summary: result.summary.length > 0 ? result.summary : undefined,
        },
      ])
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-y-0 start-0 z-40 w-80 sm:w-96 flex flex-col bg-white border-e border-neutral-200 shadow-2xl"
      style={{ direction: "rtl" }}
    >
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-gradient-to-l from-violet-50 to-white">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-800">עוזר AI</p>
            <p className="text-[10px] text-neutral-400">עריכת טופס בשפה חופשית</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8 space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto">
              <Bot className="h-6 w-6 text-violet-600" />
            </div>
            <p className="text-sm font-medium text-neutral-700">מה תרצה לשנות?</p>
            <div className="space-y-1.5">
              {[
                "תוסיף שדה אימייל",
                "תשנה את שם משפחה לחובה",
                "תמחק את שדה המיקום",
                "תזיז את החתימה לסוף",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => { setInput(suggestion); inputRef.current?.focus() }}
                  className="block w-full text-xs text-neutral-500 bg-neutral-50 hover:bg-violet-50 hover:text-violet-600 rounded-lg px-3 py-2 text-start transition-colors"
                >
                  &quot;{suggestion}&quot;
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`shrink-0 h-7 w-7 rounded-lg flex items-center justify-center ${
              msg.role === "user"
                ? "bg-neutral-800"
                : "bg-gradient-to-br from-violet-500 to-purple-600"
            }`}>
              {msg.role === "user"
                ? <User className="h-3.5 w-3.5 text-white" />
                : <Bot className="h-3.5 w-3.5 text-white" />
              }
            </div>
            <div className={`flex-1 min-w-0 space-y-1.5 ${msg.role === "user" ? "text-end" : ""}`}>
              <div className={`inline-block rounded-xl px-3 py-2 text-sm leading-relaxed max-w-full ${
                msg.role === "user"
                  ? "bg-neutral-800 text-white rounded-tl-md"
                  : "bg-neutral-100 text-neutral-800 rounded-tr-md"
              }`}>
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              </div>
              {msg.summary && msg.summary.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {msg.summary.map((s, j) => (
                    <Badge key={j} variant="outline" className="text-[10px] rounded-md bg-violet-50 text-violet-600 border-violet-200">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isPending && (
          <div className="flex gap-2.5">
            <div className="shrink-0 h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
            </div>
            <div className="bg-neutral-100 rounded-xl rounded-tr-md px-3 py-2">
              <p className="text-sm text-neutral-400">חושב...</p>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-neutral-100 p-3">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="תאר מה לשנות..."
            rows={1}
            disabled={isPending}
            className="flex-1 min-h-[40px] max-h-[100px] rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent disabled:opacity-50"
          />
          <Button
            onClick={handleSend}
            disabled={isPending || !input.trim()}
            size="icon"
            className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shrink-0"
          >
            {isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />
            }
          </Button>
        </div>
        <p className="text-[10px] text-neutral-400 mt-1.5 px-1">
          {fields.length} שדות בטופס · Enter לשליחה
        </p>
      </div>
    </div>
  )
}
