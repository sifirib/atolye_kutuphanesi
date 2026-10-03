import { resolveBasePath } from "@quartz-community/utils"
import { dailyAyet, nextDayDelay, type AyetQuote } from "./data"

let entries: AyetQuote[] = []
let request: Promise<void> | undefined
let timer = 0
let observer: ResizeObserver | undefined
let paused = false
try {
  paused = localStorage.getItem("library:ticker-paused") === "true"
} catch {}

function enabled() {
  return document.documentElement.dataset.dailyTicker !== "off"
}
function measure() {
  if (!enabled()) return
  const bar = document.querySelector<HTMLElement>(".daily-ticker")
  const viewport = bar?.querySelector<HTMLElement>(".ticker-viewport")
  const quote = bar?.querySelector<HTMLElement>(".ticker-quote")
  if (!bar || !viewport || !quote) return
  bar.style.setProperty("--ticker-width", `${viewport.clientWidth}px`)
  bar.style.setProperty("--ticker-duration", `${Math.max(25, quote.offsetWidth / 35)}s`)
}
function update() {
  clearTimeout(timer)
  if (!enabled()) return
  const bar = document.querySelector<HTMLElement>(".daily-ticker")
  if (!bar) return
  const now = new Date()
  const entry = dailyAyet(entries, now)
  const link = bar.querySelector<HTMLAnchorElement>(".ticker-track")!
  if (entry) {
    link.href = new URL(`${resolveBasePath(entry.slug)}#${entry.ayet}`, location.href).href
    const text = `${entry.text}  (${entry.name} ${entry.ayet})`
    bar.querySelectorAll(".ticker-quote").forEach((node) => {
      node.textContent = text
    })
  }
  bar.dataset.paused = String(paused)
  bar.dataset.background = String(document.hidden)
  const button = bar.querySelector<HTMLButtonElement>(".ticker-pause")!
  button.disabled = !entry
  button.setAttribute("aria-pressed", String(paused))
  button.title = paused ? "Akışı devam ettir" : "Akışı duraklat"
  button.setAttribute("aria-label", button.title)
  button.querySelector("path")!.setAttribute("d", paused ? "m9 5 10 7-10 7Z" : "M9 5v14M15 5v14")
  requestAnimationFrame(measure)
  timer = window.setTimeout(update, nextDayDelay(now))
}
function mount() {
  clearTimeout(timer)
  observer?.disconnect()
  if (!enabled()) return
  const viewport = document.querySelector<HTMLElement>(".daily-ticker .ticker-viewport")
  if (!viewport) return
  observer = new ResizeObserver(measure)
  observer.observe(viewport)
  update()
  request ??= fetch(resolveBasePath("static/daily-ayets.json"))
    .then(async (response) => {
      if (!response.ok) throw new Error("Daily ayets unavailable")
      const data: unknown = await response.json()
      if (Array.isArray(data))
        entries = data.filter(
          (item): item is AyetQuote =>
            item &&
            typeof item.slug === "string" &&
            typeof item.name === "string" &&
            typeof item.text === "string" &&
            Number.isInteger(item.ayet) &&
            item.ayet > 0,
        )
      update()
    })
    .catch(() => {
      request = undefined
    })
}
document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element) || !event.target.closest(".ticker-pause")) return
  paused = !paused
  try {
    localStorage.setItem("library:ticker-paused", String(paused))
  } catch {}
  update()
})
document.addEventListener("nav", mount)
document.addEventListener("daily-ticker-change", mount)
document.addEventListener("prenav", () => {
  clearTimeout(timer)
  observer?.disconnect()
})
document.addEventListener("visibilitychange", () => {
  document
    .querySelector<HTMLElement>(".daily-ticker")
    ?.setAttribute("data-background", String(document.hidden))
  if (!document.hidden) update()
})
mount()
