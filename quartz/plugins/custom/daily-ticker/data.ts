import type { Element, Root } from "hast"
import { visit, SKIP } from "unist-util-visit"

export type AyetQuote = { slug: string; name: string; ayet: number; text: string }
// Keep whole ayets; this small pool avoids sending the entire library to each reader.
const references = new Map<number, number[]>([
  [1, [5]],
  [2, [152, 153, 186]],
  [3, [139]],
  [13, [28]],
  [16, [90]],
  [17, [36]],
  [20, [114]],
  [31, [18, 19]],
  [39, [53]],
  [49, [13]],
  [94, [5, 6]],
  [96, [1]],
])
const hasClass = (node: Element, name: string) =>
  Array.isArray(node.properties.className) && node.properties.className.includes(name)
function textContent(node: Element): string {
  return node.children
    .map((child) =>
      child.type === "text"
        ? child.value
        : child.type === "element"
          ? child.tagName === "br"
            ? " "
            : textContent(child)
          : "",
    )
    .join("")
}
export function collectAyets(tree: Root, slug: string, name: string, sure: number): AyetQuote[] {
  const selected = references.get(sure)
  if (!selected) return []
  const entries: AyetQuote[] = []
  visit(tree, "element", (node) => {
    if (hasClass(node, "transclude")) return SKIP
    if (!hasClass(node, "quran-verse") || !selected.includes(Number(node.properties.id))) return
    const meal = node.children.find(
      (child): child is Element => child.type === "element" && hasClass(child, "quran-translation"),
    )
    const text = meal && textContent(meal).replace(/\s+/g, " ").trim()
    if (text) entries.push({ slug, name, ayet: Number(node.properties.id), text })
  })
  return entries
}

export function dayNumber(now: Date): number {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now)
  const part = (type: string) => Number(parts.find((item) => item.type === type)!.value)
  return Date.UTC(part("year"), part("month") - 1, part("day")) / 86400000
}
export function dailyAyet(entries: AyetQuote[], now: Date): AyetQuote | undefined {
  return entries[((dayNumber(now) % entries.length) + entries.length) % entries.length]
}
export function nextDayDelay(now: Date): number {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Istanbul",
    hourCycle: "h23",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(now)
  const part = (type: string) => Number(parts.find((item) => item.type === type)!.value)
  return (
    ((24 - part("hour")) * 3600 - part("minute") * 60 - part("second")) * 1000 -
    now.getMilliseconds() +
    100
  )
}
