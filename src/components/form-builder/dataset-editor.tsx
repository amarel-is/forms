"use client"

import { useState } from "react"
import { nanoid } from "nanoid"
import {
  ArrowRight,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Database,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { FormDataset, DatasetColumn, DatasetRow } from "@/lib/types"

interface DatasetEditorProps {
  dataset: FormDataset
  onChange: (dataset: FormDataset) => void
  onBack: () => void
  onDelete: () => void
}

export function DatasetEditor({
  dataset,
  onChange,
  onBack,
  onDelete,
}: DatasetEditorProps) {
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(dataset.name)
  const [editingColId, setEditingColId] = useState<string | null>(null)
  const [colDraft, setColDraft] = useState({ name: "", type: "text" as DatasetColumn["type"] })

  function updateDataset(patch: Partial<FormDataset>) {
    onChange({ ...dataset, ...patch })
  }

  // ── Name ──────────────────────────────────────────────────────────────────

  function commitName() {
    const trimmed = nameDraft.trim()
    if (trimmed) updateDataset({ name: trimmed })
    setEditingName(false)
  }

  // ── Columns ───────────────────────────────────────────────────────────────

  function addColumn() {
    const id = nanoid(8)
    const col: DatasetColumn = { id, name: `עמודה ${dataset.columns.length + 1}`, type: "text" }
    updateDataset({ columns: [...dataset.columns, col] })
  }

  function startEditColumn(col: DatasetColumn) {
    setEditingColId(col.id)
    setColDraft({ name: col.name, type: col.type })
  }

  function commitColumn() {
    if (!editingColId) return
    const trimmed = colDraft.name.trim()
    if (!trimmed) { setEditingColId(null); return }
    updateDataset({
      columns: dataset.columns.map((c) =>
        c.id === editingColId ? { ...c, name: trimmed, type: colDraft.type } : c
      ),
    })
    setEditingColId(null)
  }

  function deleteColumn(colId: string) {
    updateDataset({
      columns: dataset.columns.filter((c) => c.id !== colId),
      rows: dataset.rows.map((r) => {
        const next = { ...r }
        delete next[colId]
        return next
      }),
    })
  }

  // ── Rows ──────────────────────────────────────────────────────────────────

  function addRow() {
    const row: DatasetRow = { id: nanoid(8) }
    dataset.columns.forEach((c) => {
      row[c.id] = c.type === "number" ? 0 : ""
    })
    updateDataset({ rows: [...dataset.rows, row] })
  }

  function updateCell(rowId: string, colId: string, raw: string) {
    const col = dataset.columns.find((c) => c.id === colId)
    const value = col?.type === "number" ? (raw === "" ? 0 : Number(raw)) : raw
    updateDataset({
      rows: dataset.rows.map((r) =>
        r.id === rowId ? { ...r, [colId]: value } : r
      ),
    })
  }

  function deleteRow(rowId: string) {
    updateDataset({ rows: dataset.rows.filter((r) => r.id !== rowId) })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-neutral-50"
      style={{ direction: "rtl" }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="shrink-0 bg-[#2D4458] border-b border-[rgba(148,163,184,0.15)] px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-8 w-8 rounded-xl shrink-0 text-white/70 hover:text-white hover:bg-white/10"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>

          <Database className="h-4 w-4 text-white/60 shrink-0" />

          {editingName ? (
            <div className="flex items-center gap-1.5">
              <Input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitName(); if (e.key === "Escape") setEditingName(false) }}
                autoFocus
                className="h-7 w-48 rounded-lg text-sm font-semibold bg-white/10 text-white border-white/20 px-2 focus-visible:ring-white/30"
              />
              <button type="button" onClick={commitName} className="text-white/70 hover:text-white">
                <Check className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setEditingName(false)} className="text-white/70 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setNameDraft(dataset.name); setEditingName(true) }}
              className="flex items-center gap-1.5 text-sm font-semibold text-white hover:text-white/80 transition-colors"
            >
              {dataset.name}
              <Pencil className="h-3 w-3 text-white/40" />
            </button>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="rounded-xl gap-1.5 h-8 text-xs text-red-300 hover:text-red-200 hover:bg-red-500/20"
        >
          <Trash2 className="h-3.5 w-3.5" />
          מחק מאגר
        </Button>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={addColumn}
                className="rounded-xl gap-1.5 h-8 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                הוסף עמודה
              </Button>
              <span className="text-xs text-neutral-400">
                {dataset.columns.length} עמודות · {dataset.rows.length} שורות
              </span>
            </div>
          </div>

          {/* Table */}
          {dataset.columns.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-neutral-200">
              <Database className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
              <p className="text-sm text-neutral-500 mb-1">המאגר ריק</p>
              <p className="text-xs text-neutral-400 mb-4">הוסף עמודות כדי להתחיל לבנות את הטבלה</p>
              <Button variant="outline" size="sm" onClick={addColumn} className="rounded-xl gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" />
                הוסף עמודה ראשונה
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ direction: "rtl" }}>
                  {/* Column headers */}
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50/80">
                      <th className="w-10 px-2 py-2.5 text-center text-xs font-medium text-neutral-400">#</th>
                      {dataset.columns.map((col) => (
                        <th key={col.id} className="px-3 py-2.5 text-start">
                          {editingColId === col.id ? (
                            <div className="flex items-center gap-1.5">
                              <Input
                                value={colDraft.name}
                                onChange={(e) => setColDraft((d) => ({ ...d, name: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === "Enter") commitColumn(); if (e.key === "Escape") setEditingColId(null) }}
                                autoFocus
                                className="h-7 text-xs rounded-lg flex-1 min-w-[80px]"
                              />
                              <Select
                                value={colDraft.type}
                                onValueChange={(v: DatasetColumn["type"]) => setColDraft((d) => ({ ...d, type: v }))}
                              >
                                <SelectTrigger className="h-7 w-24 rounded-lg text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">טקסט</SelectItem>
                                  <SelectItem value="number">מספר</SelectItem>
                                </SelectContent>
                              </Select>
                              <button type="button" onClick={commitColumn} className="text-green-600 hover:text-green-700">
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button type="button" onClick={() => setEditingColId(null)} className="text-neutral-400 hover:text-neutral-600">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 group">
                              <span className="text-xs font-semibold text-neutral-700">{col.name}</span>
                              <span className="text-[10px] text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">
                                {col.type === "number" ? "מספר" : "טקסט"}
                              </span>
                              <button
                                type="button"
                                onClick={() => startEditColumn(col)}
                                className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-neutral-600 transition-opacity"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteColumn(col.id)}
                                className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </th>
                      ))}
                      <th className="w-10" />
                    </tr>
                  </thead>

                  {/* Rows */}
                  <tbody>
                    {dataset.rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={dataset.columns.length + 2}
                          className="py-8 text-center text-xs text-neutral-400"
                        >
                          אין שורות — לחץ &quot;הוסף שורה&quot; למטה
                        </td>
                      </tr>
                    ) : (
                      dataset.rows.map((row, rowIdx) => (
                        <tr
                          key={row.id}
                          className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50/50 transition-colors"
                        >
                          <td className="px-2 py-1.5 text-center text-xs text-neutral-400 font-mono">
                            {rowIdx + 1}
                          </td>
                          {dataset.columns.map((col) => (
                            <td key={col.id} className="px-1.5 py-1.5">
                              <Input
                                type={col.type === "number" ? "number" : "text"}
                                value={String(row[col.id] ?? "")}
                                onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                                className="h-8 rounded-lg text-xs border-transparent bg-transparent hover:bg-white hover:border-neutral-200 focus:bg-white focus:border-neutral-300 transition-all"
                              />
                            </td>
                          ))}
                          <td className="px-2 py-1.5">
                            <button
                              type="button"
                              onClick={() => deleteRow(row.id)}
                              className="text-neutral-300 hover:text-red-500 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add row */}
              <div className="border-t border-neutral-100 px-3 py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addRow}
                  className="w-full h-8 rounded-xl gap-1.5 text-xs text-neutral-500 hover:text-neutral-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  הוסף שורה
                </Button>
              </div>
            </div>
          )}

          {/* Help text */}
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <Label className="text-xs font-medium text-blue-700">איך להשתמש?</Label>
            <p className="text-xs text-blue-600 mt-1">
              הגדר עמודות (שם, מחיר, מק&quot;ט...) והוסף שורות עם הנתונים. 
              בחזרה לעורך הטופס, תוכל לקשר שדה dropdown / radio / multiselect למאגר הזה — 
              האפשרויות ייטענו אוטומטית מהנתונים.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
