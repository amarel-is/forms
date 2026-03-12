#!/usr/bin/env node
/**
 * Import sites CSV into the form's dataset (schema.datasets).
 * 
 * Usage:  node scripts/import-sites-dataset.mjs
 * 
 * Reads:  docs/אתרים-Grid 2.csv
 * Target: form d89b6030-5e52-4280-be30-e3159796f462
 */

import { readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "https://eklcljkwdsfhsfjhezqk.supabase.co"
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrbGNsamt3ZHNmaHNmamhlenFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0NDQzOCwiZXhwIjoyMDg4MDIwNDM4fQ.kgyEyQyd1ut_br4hDKVEQJb7bSxO5CdbkqJpcsEHHa0"

const FORM_ID = "d89b6030-5e52-4280-be30-e3159796f462"
const CSV_PATH = new URL("../docs/אתרים-Grid 2.csv", import.meta.url)

// 10 sites to mark as "אסור לעבודה" for demo purposes
const BLOCKED_SITES = new Set([
  "365 אבשלום",
  "458 אילת",
  "446 בית אריזה גלבוע",
  "156 בית העמק",
  "493 איילת השחר",
  "356 אלוני הבשן",
  "100 אורטל",
  "352 אורטל",
  "353 אורטל",
  "354 אורטל",
])

// Column IDs
const COL_ID    = "col_site_id"
const COL_NAME  = "col_site_name"
const COL_STATUS = "col_status"
const COL_FILES = "col_files_link"

function parseCsv(raw) {
  const lines = raw.split("\n").filter(Boolean)
  const rows = []
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    // Handle quoted fields (some URLs contain commas)
    const fields = []
    let current = ""
    let inQuotes = false
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === "," && !inQuotes) {
        fields.push(current.trim())
        current = ""
      } else {
        current += char
      }
    }
    fields.push(current.trim())
    
    if (fields.length >= 3) {
      rows.push({
        siteId: fields[0],
        name: fields[1],
        status: fields[2],
        filesLink: fields[3] || "",
      })
    }
  }
  return rows
}

async function main() {
  console.log("Reading CSV...")
  const raw = readFileSync(CSV_PATH, "utf-8")
  const sites = parseCsv(raw)
  console.log(`Parsed ${sites.length} sites from CSV`)

  // Build dataset
  const dataset = {
    id: "ds_sites",
    name: "אתרים",
    columns: [
      { id: COL_ID, name: "מזהה אתר", type: "text" },
      { id: COL_NAME, name: "שם האתר", type: "text" },
      { id: COL_STATUS, name: "סטטוס אתר", type: "text" },
      { id: COL_FILES, name: "קישור לתיקיית קבצים", type: "text" },
    ],
    rows: sites.map((site, i) => {
      const name = site.name.trim()
      return {
        id: `row_${i}`,
        [COL_ID]: site.siteId,
        [COL_NAME]: name,
        [COL_STATUS]: BLOCKED_SITES.has(name) ? "אסור לעבודה" : site.status,
        [COL_FILES]: site.filesLink,
      }
    }),
  }

  const blocked = dataset.rows.filter(r => r[COL_STATUS] === "אסור לעבודה")
  const allowed = dataset.rows.filter(r => r[COL_STATUS] === "מותר לעבודה")
  console.log(`Status breakdown: ${allowed.length} מותר, ${blocked.length} אסור`)

  // Update form schema
  console.log("Connecting to Supabase...")
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  const { data, error } = await supabase
    .from("forms")
    .update({ schema: { datasets: [dataset] } })
    .eq("id", FORM_ID)
    .select("id, name")
    .single()

  if (error) {
    console.error("Error updating form:", error.message)
    process.exit(1)
  }

  console.log(`Updated form "${data.name}" (${data.id})`)
  console.log(`Dataset "${dataset.name}": ${dataset.columns.length} columns, ${dataset.rows.length} rows`)
  console.log("\nDone! Now link the dropdown field to this dataset in the form builder.")
}

main().catch(console.error)
