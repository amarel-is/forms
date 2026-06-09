import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const BUCKET = "form-images"
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml"]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params

  // Authenticate
  const apiKey = request.headers.get("x-api-key")
  if (!apiKey) {
    return NextResponse.json({ error: "Missing x-api-key header" }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: form } = await supabase
    .from("forms")
    .select("id, api_key")
    .eq("id", formId)
    .single()

  if (!form || form.api_key !== apiKey) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 403 })
  }

  // Parse body — support both multipart/form-data and raw binary
  const contentType = request.headers.get("content-type") ?? ""
  let fileBuffer: Buffer
  let mimeType: string
  let ext: string

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "Missing 'file' in form data" }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 })
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File exceeds 5MB limit" }, { status: 400 })
    }
    mimeType = file.type
    ext = file.name.split(".").pop() ?? "png"
    fileBuffer = Buffer.from(await file.arrayBuffer())
  } else {
    // Raw binary — Make.com QR module sends raw image bytes
    const bodyBuffer = await request.arrayBuffer()
    if (bodyBuffer.byteLength === 0) {
      return NextResponse.json({ error: "Empty body" }, { status: 400 })
    }
    if (bodyBuffer.byteLength > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File exceeds 5MB limit" }, { status: 400 })
    }

    // Detect type from content-type header or default to png
    if (contentType.includes("image/jpeg") || contentType.includes("image/jpg")) {
      mimeType = "image/jpeg"
      ext = "jpg"
    } else if (contentType.includes("image/gif")) {
      mimeType = "image/gif"
      ext = "gif"
    } else if (contentType.includes("image/webp")) {
      mimeType = "image/webp"
      ext = "webp"
    } else if (contentType.includes("image/svg")) {
      mimeType = "image/svg+xml"
      ext = "svg"
    } else {
      // Default to PNG (most QR generators output PNG)
      mimeType = "image/png"
      ext = "png"
    }

    fileBuffer = Buffer.from(bodyBuffer)
  }

  // Upload to Supabase Storage
  const fileName = `api/${formId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, fileBuffer, { contentType: mimeType, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName)

  return NextResponse.json({ url: urlData.publicUrl })
}
