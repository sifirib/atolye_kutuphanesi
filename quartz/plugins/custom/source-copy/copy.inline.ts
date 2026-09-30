import { plainText, type CopyNode } from "./format"

type Snapshot = { html: string; text: string; source: string; url: string }
let selected: Snapshot | undefined
const toolbar = document.createElement("div")
toolbar.className = "source-copy-toolbar"
toolbar.setAttribute("role", "group")
toolbar.setAttribute("aria-label", "Seçili metni kopyala")
toolbar.hidden = true
toolbar.innerHTML = '<button type="button">Kaynaklı kopyala</button><button type="button">Telegram için kopyala</button>'
const status = document.createElement("div")
status.className = "source-copy-status"
status.setAttribute("role", "status")
document.body.append(toolbar, status)
let statusTimer: ReturnType<typeof setTimeout>

function sanitize(node: Node): { html: string; model: CopyNode } {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? ""
    const span = document.createElement("span")
    span.textContent = text
    return { html: span.innerHTML, model: { text } }
  }
  if (node instanceof Element && (node.matches("button,script,style,.quran-number,.quran-toolbar") || node.hasAttribute("hidden"))) return { html: "", model: { text: "" } }
  const children = Array.from(node.childNodes).map(sanitize)
  const tag = node instanceof Element && !node.matches(".quran-verses,.quran-item") ? node.tagName.toLowerCase() : "div"
  const allowed = /^(p|br|strong|b|em|i|ol|ul|li|blockquote|h[1-6]|div|span|code)$/
  const safeTag = allowed.test(tag) ? tag : "span"
  const start = node instanceof HTMLOListElement ? node.start : undefined
  const html = children.map((child) => child.html).join("")
  return { html: safeTag === "br" ? "<br>" : `<${safeTag}${start ? ` start="${start}"` : ""}>${html}</${safeTag}>`, model: { tag: safeTag, start, children: children.map((child) => child.model) } }
}

function snapshot(fragment: Node, origin: HTMLElement, ayet?: HTMLElement): Snapshot {
  const result = sanitize(fragment)
  const url = new URL(origin.dataset.copyUrl!)
  let block = ayet ?? origin.closest<HTMLElement>("[data-copy-id]")
  if (!block) {
    const container = origin.closest("article")
    block = Array.from(container?.querySelectorAll<HTMLElement>("h1[data-copy-id],h2[data-copy-id],h3[data-copy-id],h4[data-copy-id],h5[data-copy-id],h6[data-copy-id]") ?? [])
      .filter((heading) => heading.dataset.copyUrl === origin.dataset.copyUrl && Boolean(heading.compareDocumentPosition(origin) & Node.DOCUMENT_POSITION_FOLLOWING)).at(-1) ?? null
  }
  const id = block?.dataset.copyId
  if (id) url.hash = id
  const meal = ayet?.querySelector<HTMLElement>(".quran-translation")
  const includesMeal = meal && getComputedStyle(meal).display !== "none" && !meal.hidden
  const source = `${origin.dataset.copyTitle ?? ""}${ayet ? ` ${id}` : ""}${includesMeal && ayet?.dataset.copyMeal ? ` — ${ayet.dataset.copyMeal}` : ""}`
  return { html: result.html, text: plainText(result.model).trim().replace(/\n{3,}/g, "\n\n"), source, url: url.href }
}

async function copy(value: Snapshot, telegram: boolean) {
  const text = `${value.text}\n\n${value.source}\n${value.url}`
  const attribution = document.createElement("p")
  attribution.textContent = value.source + " "
  const link = document.createElement("a")
  link.href = value.url
  link.textContent = value.url
  attribution.append(link)
  // Normal chat paste uses rich clipboard entities, never Bot API MarkdownV2.
  const html = value.html + attribution.outerHTML
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([new ClipboardItem({
        "text/plain": new Blob([text], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" }),
      })])
    } else await navigator.clipboard.writeText(text)
    status.textContent = telegram ? "Telegram’a yapıştırmak için kopyalandı." : "Kaynakla birlikte kopyalandı."
  } catch { status.textContent = "Kopyalanamadı. Lütfen tekrar deneyin." }
  clearTimeout(statusTimer)
  statusTimer = setTimeout(() => { status.textContent = "" }, 4000)
}

function updateSelection() {
  if (toolbar.contains(document.activeElement)) return
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || !selection.rangeCount) { toolbar.hidden = true; selected = undefined; return }
  const range = selection.getRangeAt(0)
  const element = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement
  const origin = element?.closest<HTMLElement>("[data-copy-url]")
  const end = range.endContainer instanceof Element ? range.endContainer : range.endContainer.parentElement
  if (!origin || end?.closest<HTMLElement>("[data-copy-url]")?.dataset.copyUrl !== origin.dataset.copyUrl) { toolbar.hidden = true; selected = undefined; return }
  let fragment: Node = range.cloneContents()
  // cloneContents omits the common ancestor (e.g. a selection inside <strong>).
  let ancestor = range.commonAncestorContainer instanceof Element ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement
  while (ancestor && !ancestor.matches("article,.popover-inner")) {
    if (ancestor.matches("strong,b,em,i,code")) {
      const wrapper = ancestor.cloneNode(false)
      wrapper.appendChild(fragment)
      fragment = wrapper
    }
    ancestor = ancestor.parentElement
  }
  selected = snapshot(fragment, origin)
  const scope = origin.closest("article,.popover-inner")
  const ayets = Array.from(scope?.querySelectorAll<HTMLElement>(".quran-verse") ?? [])
    .filter((ayet) => ayet.dataset.copyUrl === origin.dataset.copyUrl && range.intersectsNode(ayet))
  if (ayets.length) {
    const first = ayets[0]
    const last = ayets[ayets.length - 1]
    const sourceUrl = new URL(selected.url)
    sourceUrl.hash = first.dataset.copyId!
    selected.url = sourceUrl.href
    const hasMeal = ayets.some((ayet) => {
      const meal = ayet.querySelector<HTMLElement>(".quran-translation")
      return meal && !meal.hidden && getComputedStyle(meal).display !== "none" && range.intersectsNode(meal)
    })
    selected.source = `${first.dataset.copyTitle} ${first.dataset.copyId}${first === last ? "" : `–${last.dataset.copyId}`}${hasMeal && first.dataset.copyMeal ? ` — ${first.dataset.copyMeal}` : ""}`
  }
  const popup = origin.closest(".popover")
  ;(popup ?? document.body).append(toolbar)
  toolbar.hidden = false
  const bounds = range.getBoundingClientRect()
  toolbar.style.left = `${Math.max(8, Math.min(bounds.left, innerWidth - toolbar.offsetWidth - 8))}px`
  toolbar.style.top = `${Math.max(8, Math.min(bounds.bottom + 8, innerHeight - toolbar.offsetHeight - 8))}px`
}
document.addEventListener("selectionchange", updateSelection)
toolbar.addEventListener("pointerdown", (event) => { if (event.pointerType === "mouse") event.preventDefault() })
toolbar.querySelectorAll("button").forEach((button, index) => button.addEventListener("click", () => { if (selected) void copy(selected, index === 1) }))
document.addEventListener("keydown", (event) => {
  if (event.key === "Tab" && !event.shiftKey && selected && !toolbar.hidden && !toolbar.contains(document.activeElement)) { event.preventDefault(); toolbar.querySelector("button")?.focus() }
  if (event.key === "Escape") { toolbar.hidden = true; selected = undefined }
})
document.addEventListener("click", (event) => {
  const button = (event.target as Element).closest(".ayet-copy")
  const ayet = button?.closest<HTMLElement>(".quran-verse")
  if (!ayet) return
  const fragment = document.createDocumentFragment()
  ayet.querySelectorAll<HTMLElement>(".quran-arabic,.quran-translation").forEach((part) => {
    if (!part.hidden && getComputedStyle(part).display !== "none") fragment.append(part.cloneNode(true))
  })
  void copy(snapshot(fragment, ayet, ayet), false)
})
document.addEventListener("prenav", () => { toolbar.hidden = true; selected = undefined; document.body.append(toolbar, status) })
document.addEventListener("nav", () => { document.body.append(toolbar, status) })
