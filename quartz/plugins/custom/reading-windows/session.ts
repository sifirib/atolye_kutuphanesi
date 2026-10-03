import type { Place, Rect } from "./geometry"

export type SavedWindow = {
  url: string
  title: string
  rect: Rect
  freeRect: Rect
  place: Place | null
  minimized: boolean
  scrollTop: number
}
const key = "atolye:reading-windows:v1"
const places = new Set([
  "left",
  "right",
  "top",
  "bottom",
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "full",
])
function isRect(value: unknown): value is Rect {
  if (!value || typeof value !== "object") return false
  const r = value as Rect
  return [r.x, r.y, r.width, r.height].every(Number.isFinite) && r.width > 0 && r.height > 0
}

// Treat browser storage as untrusted; a bad record must not break the page.
export function readSession(storage: Pick<Storage, "getItem">, origin: string): SavedWindow[] {
  try {
    const data: unknown = JSON.parse(storage.getItem(key) ?? "null")
    if (!Array.isArray(data)) return []
    const seen = new Set<string>()
    return data.filter((item): item is SavedWindow => {
      if (!item || typeof item !== "object" || typeof item.url !== "string") return false
      let url: URL
      try {
        url = new URL(item.url)
      } catch {
        return false
      }
      if (url.origin !== origin || !/^https?:$/.test(url.protocol) || seen.has(url.href))
        return false
      if (
        !isRect(item.rect) ||
        !isRect(item.freeRect) ||
        typeof item.title !== "string" ||
        typeof item.minimized !== "boolean" ||
        !Number.isFinite(item.scrollTop) ||
        item.scrollTop < 0 ||
        (item.place !== null && !places.has(item.place))
      )
        return false
      seen.add(url.href)
      return true
    })
  } catch {
    return []
  }
}

export function writeSession(storage: Pick<Storage, "setItem">, windows: SavedWindow[]) {
  try {
    storage.setItem(key, JSON.stringify(windows))
  } catch {
    /* Private mode/quota: windows still work in memory. */
  }
}
