import { plainText, quotedText, type CopyNode } from "./format"

type Snapshot = { html: string; text: string; source: string }
let selected: Snapshot | undefined
const toolbar = document.createElement("div")
toolbar.className = "source-copy-toolbar"
toolbar.setAttribute("role", "group")
toolbar.setAttribute("aria-label", "Seçili metni kopyala")
toolbar.hidden = true
toolbar.innerHTML =
  '<button type="button">Kaynaklı kopyala</button><button type="button">Telegram’a kopyala</button>'
const status = document.createElement("div")
status.className = "source-copy-status"
status.setAttribute("role", "status")
document.body.append(toolbar, status)
let statusTimer: ReturnType<typeof setTimeout>

function sanitize(node: Node, flattenRecord = false): { html: string; model: CopyNode } {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? ""
    const span = document.createElement("span")
    span.textContent = text
    return { html: span.innerHTML, model: { text } }
  }
  if (
    node instanceof Element &&
    (node.matches("button,script,style,.quran-number,.quran-toolbar") ||
      node.hasAttribute("hidden"))
  )
    return { html: "", model: { text: "" } }
  const children = Array.from(node.childNodes).map((child) => sanitize(child))
  const tag =
    node instanceof Element &&
    !node.matches(".quran-verses,.quran-item") &&
    !(flattenRecord && node.matches("[data-copy-hadis]"))
      ? node.tagName.toLowerCase()
      : "div"
  const allowed = /^(p|br|strong|b|em|i|ol|ul|li|blockquote|h[1-6]|div|span|code)$/
  const safeTag = allowed.test(tag) ? tag : "span"
  const start = node instanceof HTMLOListElement ? node.start : undefined
  const html = children.map((child) => child.html).join("")
  return {
    html:
      safeTag === "br"
        ? "<br>"
        : `<${safeTag}${start ? ` start="${start}"` : ""}>${html}</${safeTag}>`,
    model: { tag: safeTag, start, children: children.map((child) => child.model) },
  }
}

function snapshot(fragment: Node, record?: HTMLElement): Snapshot {
  // Only a complete record copied by its own button loses the outer list marker.
  const result = sanitize(fragment, !!record?.dataset.copyHadis)
  const source = record?.dataset.copyHadis
    ? `Buhari ${record.dataset.copyHadis}`
    : record
      ? `${record.dataset.copyTitle} ${record.dataset.copyId}`
      : ""
  return {
    html: result.html,
    text: plainText(result.model)
      .trim()
      .replace(/\n{3,}/g, "\n\n"),
    source,
  }
}

async function copy(value: Snapshot, telegram: boolean) {
  const text = quotedText(value.text, value.source)
  const content = document.createElement("div")
  content.innerHTML = value.html
  if (value.source) {
    // Put the quotes inside the first/last paragraph so they stay with the text.
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT)
    const nodes: Text[] = []
    while (walker.nextNode()) {
      if (walker.currentNode.textContent?.trim()) nodes.push(walker.currentNode as Text)
    }
    if (nodes.length) {
      nodes[0].before(document.createTextNode('"'))
      nodes[nodes.length - 1].after(document.createTextNode(`" (${value.source})`))
    }
  }
  // Keep rich text for ordinary chat paste, without MarkdownV2 or source URLs.
  const html = content.innerHTML
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([text], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ])
    } else await navigator.clipboard.writeText(text)
    status.textContent = telegram
      ? "Telegram’a yapıştırmak için kopyalandı."
      : "Kaynakla birlikte kopyalandı."
  } catch {
    status.textContent = "Kopyalanamadı. Lütfen tekrar deneyin."
  }
  clearTimeout(statusTimer)
  statusTimer = setTimeout(() => {
    status.textContent = ""
  }, 4000)
}

function updateSelection() {
  if (toolbar.contains(document.activeElement)) return
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || !selection.rangeCount) {
    toolbar.hidden = true
    selected = undefined
    return
  }
  const range = selection.getRangeAt(0)
  const element =
    range.startContainer instanceof Element
      ? range.startContainer
      : range.startContainer.parentElement
  const origin = element?.closest<HTMLElement>("[data-copy-url]")
  const end =
    range.endContainer instanceof Element ? range.endContainer : range.endContainer.parentElement
  if (
    !origin ||
    end?.closest<HTMLElement>("[data-copy-url]")?.dataset.copyUrl !== origin.dataset.copyUrl
  ) {
    toolbar.hidden = true
    selected = undefined
    return
  }
  let fragment: Node = range.cloneContents()
  // cloneContents omits the common ancestor (e.g. a selection inside <strong>).
  let ancestor =
    range.commonAncestorContainer instanceof Element
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement
  while (ancestor && !ancestor.matches("article,.popover-inner")) {
    if (ancestor.matches("strong,b,em,i,code")) {
      const wrapper = ancestor.cloneNode(false)
      wrapper.appendChild(fragment)
      fragment = wrapper
    }
    ancestor = ancestor.parentElement
  }
  selected = snapshot(fragment)
  const scope = origin.closest("article,.popover-inner")
  const ayets = Array.from(scope?.querySelectorAll<HTMLElement>(".quran-verse") ?? []).filter(
    (ayet) => ayet.dataset.copyUrl === origin.dataset.copyUrl && range.intersectsNode(ayet),
  )
  if (ayets.length) {
    const first = ayets[0]
    const last = ayets[ayets.length - 1]
    selected.source = `${first.dataset.copyTitle} ${first.dataset.copyId}${first === last ? "" : `–${last.dataset.copyId}`}`
  } else {
    const hadis = element?.closest<HTMLElement>("[data-copy-hadis]")
    if (hadis && hadis === end?.closest("[data-copy-hadis]")) {
      selected.source = `Buhari ${hadis.dataset.copyHadis}`
    }
  }
  const popup = origin.closest(".popover")
  ;(popup ?? document.body).append(toolbar)
  toolbar.hidden = false
  const bounds = range.getBoundingClientRect()
  toolbar.style.left = `${Math.max(8, Math.min(bounds.left, innerWidth - toolbar.offsetWidth - 8))}px`
  toolbar.style.top = `${Math.max(8, Math.min(bounds.bottom + 8, innerHeight - toolbar.offsetHeight - 8))}px`
}
document.addEventListener("selectionchange", updateSelection)
toolbar.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse") event.preventDefault()
})
toolbar.querySelectorAll("button").forEach((button, index) =>
  button.addEventListener("click", () => {
    if (selected) void copy(selected, index === 1)
  }),
)
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Tab" &&
    !event.shiftKey &&
    selected &&
    !toolbar.hidden &&
    !toolbar.contains(document.activeElement)
  ) {
    event.preventDefault()
    toolbar.querySelector("button")?.focus()
  }
  if (event.key === "Escape") {
    toolbar.hidden = true
    selected = undefined
  }
})
document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return
  const button = event.target.closest(".ayet-copy,.hadis-copy")
  const hadis = button?.closest<HTMLElement>("[data-copy-hadis]")
  if (hadis) {
    void copy(snapshot(hadis, hadis), true)
    return
  }
  const ayet = button?.closest<HTMLElement>(".quran-verse")
  if (!ayet) return
  const meal = ayet.querySelector<HTMLElement>(".quran-translation")
  if (!meal) return
  const fragment = meal.cloneNode(true) as HTMLElement
  fragment.removeAttribute("hidden")
  void copy(snapshot(fragment, ayet), true)
})
document.addEventListener("prenav", () => {
  toolbar.hidden = true
  selected = undefined
  document.body.append(toolbar, status)
})
document.addEventListener("nav", () => {
  document.body.append(toolbar, status)
})
