import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  experimental: {
    serverActions: {
      // Default is 1MB — too small for phone/WhatsApp photos, which 400'd the
      // image-upload server action before it ran. 10MB comfortably covers the
      // 5MB image cap enforced in uploadFormImage().
      bodySizeLimit: "10mb",
    },
  },
}

export default nextConfig
