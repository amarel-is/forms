"use client"

import { useRef, useState } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface ApproveFormProps {
  approveAction: (formData: FormData) => Promise<void>
  rejectAction: (formData: FormData) => Promise<void>
}

export function ApproveForm({ approveAction, rejectAction }: ApproveFormProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasStrokes, setHasStrokes] = useState(false)

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ("touches" in e) {
      const touch = e.touches[0]
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY }
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY,
    }
  }

  function startDrawing(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setDrawing(true)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!drawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const pos = getPos(e, canvas)
    ctx.lineWidth = 2.5
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = "#1a1a1a"
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    setHasStrokes(true)
  }

  function endDrawing() {
    if (!drawing) return
    setDrawing(false)
  }

  function clearSignature() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasStrokes(false)
  }

  function getSignatureData(): string {
    if (!hasStrokes || !canvasRef.current) return ""
    return canvasRef.current.toDataURL("image/png")
  }

  async function handleApprove(formData: FormData) {
    formData.set("signature", getSignatureData())
    await approveAction(formData)
  }

  async function handleReject(formData: FormData) {
    await rejectAction(formData)
  }

  return (
    <div className="space-y-4">
      {/* Signature pad */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-neutral-700">חתימה (אופציונלי)</p>
          {hasStrokes && (
            <Button type="button" variant="ghost" size="sm" onClick={clearSignature}
              className="h-7 px-2 text-xs text-neutral-400 hover:text-red-500 gap-1">
              <Trash2 className="h-3.5 w-3.5" />
              נקה
            </Button>
          )}
        </div>
        <div className={`relative rounded-xl border-2 bg-white overflow-hidden ${
          drawing ? "border-neutral-400" : "border-neutral-200"
        }`}>
          <canvas
            ref={canvasRef}
            width={600}
            height={200}
            className="w-full touch-none cursor-crosshair"
            style={{ height: "140px" }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={endDrawing}
            onMouseLeave={endDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={endDrawing}
          />
          {!hasStrokes && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-sm text-neutral-300 select-none">חתום כאן</p>
            </div>
          )}
          <div className="absolute bottom-6 start-4 end-4 h-px bg-neutral-200 pointer-events-none" />
        </div>
      </div>

      {/* Approve form */}
      <form className="space-y-3" action={handleApprove}>
        <Textarea name="note" placeholder="הערה (אופציונלי)" className="min-h-20 rounded-xl" />
        <input type="hidden" name="signature" value="" />
        <Button type="submit" className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700">
          אשר
        </Button>
      </form>

      {/* Reject form */}
      <form action={handleReject}>
        <input type="hidden" name="note" value="" />
        <Button type="submit" variant="outline" className="w-full rounded-xl border-red-200 text-red-600 hover:bg-red-50">
          דחה
        </Button>
      </form>
    </div>
  )
}
