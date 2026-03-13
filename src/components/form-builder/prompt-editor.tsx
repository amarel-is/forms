"use client"

import { MentionsInput, Mention } from "react-mentions"

interface FieldOption {
  id: string
  display: string
}

interface PromptEditorProps {
  value: string
  onChange: (value: string) => void
  fields?: FieldOption[]
  placeholder?: string
  dir?: "rtl" | "ltr"
}

const controlStyle: React.CSSProperties = {
  width: "100%",
  fontSize: 14,
  lineHeight: 1.6,
  fontFamily: "inherit",
}

const inputStyle = {
  control: controlStyle,
  "&multiLine": {
    control: {
      minHeight: 120,
      borderRadius: 12,
      border: "1px solid hsl(var(--input))",
      background: "hsl(var(--background))",
      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    },
    highlighter: {
      padding: "8px 12px",
      lineHeight: 1.6,
      fontFamily: "inherit",
      fontSize: 14,
      border: "1px solid transparent",
      outline: "none",
    },
    input: {
      padding: "8px 12px",
      lineHeight: 1.6,
      fontFamily: "inherit",
      fontSize: 14,
      border: "none",
      outline: "none",
      color: "hsl(var(--foreground))",
      background: "transparent",
      resize: "none",
    },
  },
  suggestions: {
    zIndex: 50,
    list: {
      background: "white",
      border: "1px solid #e2e8f0",
      borderRadius: 10,
      fontSize: 13,
      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
      overflow: "hidden",
      minWidth: 180,
    },
    item: {
      padding: "7px 12px",
      color: "#374151",
      cursor: "pointer",
      "&focused": {
        background: "#eff6ff",
        color: "#2563eb",
      },
    },
  },
}

const mentionStyle = {
  background: "rgba(59,130,246,0.12)",
  color: "#2563eb",
  borderRadius: 4,
  padding: "0 2px",
}

export function PromptEditor({
  value,
  onChange,
  fields = [],
  placeholder,
  dir = "rtl",
}: PromptEditorProps) {
  return (
    <MentionsInput
      value={value}
      onChange={(e, newValue) => onChange(newValue)}
      placeholder={placeholder}
      dir={dir}
      style={inputStyle}
      // @ts-expect-error — react-mentions supports string|RegExp trigger
      allowSuggestionsAboveCursor
      a11ySuggestionsListLabel="שדות זמינים"
    >
      <Mention
        trigger="{"
        markup="{{__display__}}"
        displayTransform={(_id, display) => `{{${display}}}`}
        data={fields}
        style={mentionStyle}
        renderSuggestion={(suggestion, _search, _hd, _i, focused) => (
          <div
            style={{
              padding: "6px 10px",
              background: focused ? "#eff6ff" : "transparent",
              color: focused ? "#2563eb" : "#374151",
              fontSize: 12,
              borderRadius: 6,
              margin: "2px 4px",
            }}
          >
            {`{{${suggestion.display}}}`}
          </div>
        )}
        appendSpaceOnAdd
      />
    </MentionsInput>
  )
}
