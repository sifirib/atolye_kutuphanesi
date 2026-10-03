export const fonts = ["Source Sans Pro", "Tahoma", "Times New Roman", "Atkinson Hyperlegible Next"] as const
export const sizes = [15, 17, 19, 24] as const
export type Preferences = { font: typeof fonts[number]; size: typeof sizes[number]; width: "narrow" | "wide" | "full"; palette: "atolye" | "ttrpg" | "green"; ticker: boolean }
export const defaults: Preferences = { font: "Source Sans Pro", size: 17, width: "full", palette: "atolye", ticker: true }
export const storageKey = "atolye.reading.preferences"
export function validate(value: unknown): Preferences {
  const data = value && typeof value === "object" ? value as Partial<Preferences> : {}
  return {
    font: fonts.includes(data.font!) ? data.font! : defaults.font,
    size: sizes.includes(data.size!) ? data.size! : defaults.size,
    width: ["narrow", "wide", "full"].includes(data.width!) ? data.width! : defaults.width,
    palette: ["atolye", "ttrpg", "green"].includes(data.palette!) ? data.palette! : defaults.palette,
    ticker: typeof data.ticker === "boolean" ? data.ticker : defaults.ticker,
  }
}
export function migrate(value: unknown): Preferences {
  const data = value && typeof value === "object" ? value as Record<string, unknown> : {}
  return validate({ font: data.radioFont, size: Number(data.radioFontSize), width: ({ "60": "narrow", "78": "wide", "100": "full" } as Record<string, string>)[String(data.radioWidth)] })
}
export function readPreferences(): Preferences {
  try {
    const current = localStorage.getItem(storageKey)
    if (current !== null) return validate(JSON.parse(current))
    const legacy = localStorage.getItem("settingsMenu")
    const value = legacy ? migrate(JSON.parse(legacy)) : defaults
    localStorage.setItem(storageKey, JSON.stringify(value))
    return value
  } catch { return { ...defaults } }
}
export function applyPreferences(value: Preferences) {
  const root = document.documentElement
  root.dataset.readingPalette = value.palette
  root.dataset.readingWidth = value.width
  const ticker = value.ticker ? "on" : "off"
  const tickerChanged = root.dataset.dailyTicker !== ticker
  root.dataset.dailyTicker = ticker
  root.style.setProperty("--reading-font", `"${value.font}", ${value.font === "Times New Roman" ? "serif" : "sans-serif"}`)
  root.style.setProperty("--reading-size", `${value.size}px`)
  if (tickerChanged) document.dispatchEvent(new CustomEvent("daily-ticker-change", { detail: {} }))
}
