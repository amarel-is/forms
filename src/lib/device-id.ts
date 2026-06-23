// Device identification for per-device submission limiting (e.g. live one-time voting).
//
// Two complementary mechanisms:
//   1. A device fingerprint (stable SHA-256 hash of browser/hardware signals) sent to
//      the server, so a re-vote is blocked even in a fresh incognito window on the same
//      device. Not random — identical-enough environments collide on purpose.
//   2. A localStorage flag per form, used purely for instant client-side UX ("already voted")
//      without a server round-trip.
//
// Neither is tamper-proof: a determined user with multiple devices / cleared storage can
// still get around it. Good enough to stop spontaneous double-voting at a live event.

const VOTED_KEY = (formId: string) => `forms:voted:${formId}`

/** Builds a stable fingerprint from non-identifying, low-entropy device signals. */
export async function getDeviceFingerprint(): Promise<string> {
  if (typeof window === "undefined") return ""

  const signals: string[] = []
  try {
    const n = window.navigator
    signals.push(n.userAgent || "")
    signals.push(n.language || "")
    signals.push((n.languages || []).join(","))
    signals.push((n as Navigator & { platform?: string }).platform || "")
    signals.push(String(n.hardwareConcurrency ?? ""))
    signals.push(String((n as Navigator & { deviceMemory?: number }).deviceMemory ?? ""))
    signals.push(String(n.maxTouchPoints ?? ""))

    const s = window.screen
    signals.push(`${s.width}x${s.height}x${s.colorDepth}`)
    signals.push(String(window.devicePixelRatio ?? ""))

    try {
      signals.push(Intl.DateTimeFormat().resolvedOptions().timeZone || "")
    } catch {
      /* ignore */
    }

    // Canvas fingerprint — small, deterministic per GPU/driver/font stack.
    try {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.textBaseline = "top"
        ctx.font = "14px 'Arial'"
        ctx.fillStyle = "#f60"
        ctx.fillRect(0, 0, 100, 20)
        ctx.fillStyle = "#069"
        ctx.fillText("amrl-forms-fp", 2, 2)
        signals.push(canvas.toDataURL())
      }
    } catch {
      /* ignore */
    }
  } catch {
    /* ignore — partial signals still produce a usable hash */
  }

  return sha256Hex(signals.join("|"))
}

async function sha256Hex(input: string): Promise<string> {
  try {
    const data = new TextEncoder().encode(input)
    const digest = await crypto.subtle.digest("SHA-256", data)
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  } catch {
    // Fallback (non-secure contexts where subtle.digest is unavailable): simple string hash.
    let h = 0
    for (let i = 0; i < input.length; i++) {
      h = (Math.imul(31, h) + input.charCodeAt(i)) | 0
    }
    return `fb${(h >>> 0).toString(16)}`
  }
}

export function hasVotedLocally(formId: string): boolean {
  if (typeof window === "undefined") return false
  try {
    return localStorage.getItem(VOTED_KEY(formId)) === "1"
  } catch {
    return false
  }
}

export function markVotedLocally(formId: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(VOTED_KEY(formId), "1")
  } catch {
    /* ignore */
  }
}
