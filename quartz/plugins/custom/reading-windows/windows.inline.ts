import { clampRect, placeRect, resizeRect, type Place, type Rect } from "./geometry"
import { loadPreview } from "./content"
import { readSession, writeSession, type SavedWindow } from "./session"

type ReadingWindow = {
  id: number
  element: HTMLElement
  inner: HTMLElement
  title: HTMLAnchorElement
  pin: HTMLButtonElement
  menu: HTMLElement
  layoutButton: HTMLButtonElement
  anchor: HTMLAnchorElement
  request: AbortController
  rect: Rect
  freeRect: Rect
  place: Place | null
  pinned: boolean
  minimized: boolean
  tab?: HTMLButtonElement
  loaded: boolean
  savedScroll?: number
}
const desktop = matchMedia("(hover: hover) and (pointer: fine)")
const host = document.createElement("div")
host.className = "rw-host"
const dock = document.createElement("nav")
dock.className = "rw-dock"
dock.setAttribute("aria-label", "Küçültülen okuma pencereleri")
host.append(dock)
document.body.append(host)
const windows: ReadingWindow[] = []
const originals = new Map<HTMLAnchorElement, string | undefined>()
let nextId = 0
let transient: ReadingWindow | undefined
let active: ReadingWindow | undefined
let pendingLink: HTMLAnchorElement | undefined
let openTimer = 0
let closeTimer = 0
let finishGesture: (() => void) | undefined
let saveTimer = 0
let restoring = false
let sessionRestored = false

function saveSession() {
  clearTimeout(saveTimer)
  if (restoring || !desktop.matches) return
  try {
    writeSession(
      sessionStorage,
      windows
        .filter((win) => win.pinned)
        .map((win) => ({
          url: win.title.href,
          title: win.title.textContent ?? "Önizleme",
          rect: win.rect,
          freeRect: win.freeRect,
          place: win.place,
          minimized: win.minimized,
          scrollTop: win.savedScroll ?? win.inner.scrollTop,
        })),
    )
  } catch {
    /* Storage itself can be unavailable. */
  }
}
function scheduleSave() {
  clearTimeout(saveTimer)
  if (!restoring) saveTimer = window.setTimeout(saveSession, 200)
}

const icons = {
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  pin: '<path d="M9 3h6l-1 7 4 4v2H6v-2l4-4-1-7ZM12 16v6"/>',
  layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18M3 12h18"/>',
  minimize: '<path d="M5 18h14"/>',
}
function button(label: string, icon: keyof typeof icons) {
  const node = document.createElement("button")
  node.type = "button"
  node.title = label
  node.setAttribute("aria-label", label)
  node.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">${icons[icon]}</svg>`
  return node
}
function viewport() {
  return {
    width: document.documentElement.clientWidth,
    height: Math.max(40, host.clientHeight - (dock.offsetHeight ? dock.offsetHeight + 8 : 0)),
  }
}
function render(win: ReadingWindow) {
  win.element.hidden = win.minimized
  win.element.dataset.pinned = String(win.pinned)
  win.pin.setAttribute("aria-pressed", String(win.pinned))
  win.pin.title = win.pinned ? "Sabitlemeyi kaldır" : "Pencereyi sabitle"
  win.pin.setAttribute("aria-label", win.pin.title)
  Object.assign(win.element.style, {
    left: `${win.rect.x}px`,
    top: `${win.rect.y}px`,
    width: `${win.rect.width}px`,
    height: `${win.rect.height}px`,
  })
  scheduleSave()
}
function front(win: ReadingWindow) {
  active = win
  const index = windows.indexOf(win)
  if (index < 0) return
  windows.splice(index, 1)
  windows.push(win)
  windows.forEach((item, order) => {
    item.element.style.zIndex = String(order + 1)
    item.element.dataset.active = String(item === win)
  })
  scheduleSave()
}
function closeMenu(win: ReadingWindow) {
  win.menu.hidden = true
  win.layoutButton.setAttribute("aria-expanded", "false")
}
function close(win: ReadingWindow, restoreFocus = false) {
  finishGesture?.()
  win.request.abort()
  for (const link of originals.keys()) if (win.element.contains(link)) originals.delete(link)
  const index = windows.indexOf(win)
  if (index >= 0) windows.splice(index, 1)
  win.element.remove()
  win.tab?.remove()
  if (transient === win) transient = undefined
  if (active === win) active = windows.filter((item) => !item.minimized).at(-1)
  if (restoreFocus) {
    if (win.anchor.isConnected) win.anchor.focus({ preventScroll: true })
    else if (active) active.pin.focus({ preventScroll: true })
    else {
      const heading = document.querySelector<HTMLElement>(".center h1")
      if (heading) {
        heading.tabIndex = -1
        heading.focus({ preventScroll: true })
      }
    }
  }
  fitAll()
  scheduleSave()
}
function closeTransient() {
  clearTimeout(openTimer)
  clearTimeout(closeTimer)
  pendingLink = undefined
  if (transient) close(transient)
}
function pin(win: ReadingWindow) {
  win.pinned = true
  if (transient === win) transient = undefined
  clearTimeout(closeTimer)
  render(win)
}
function fitAll() {
  const bounds = viewport()
  windows.forEach((win) => {
    win.rect = win.place ? placeRect(win.place, bounds) : clampRect(win.rect, bounds)
    render(win)
  })
}
function minimize(win: ReadingWindow, focus = true) {
  pin(win)
  closeMenu(win)
  if (win.loaded) win.savedScroll = win.inner.scrollTop
  win.minimized = true
  const tab = document.createElement("button")
  tab.type = "button"
  tab.textContent = win.title.textContent
  tab.title = `${win.title.textContent} — geri aç`
  tab.addEventListener("click", () => {
    win.minimized = false
    tab.remove()
    win.tab = undefined
    fitAll()
    front(win)
    if (!win.loaded) void fill(win)
    else if (win.savedScroll !== undefined) {
      win.inner.scrollTop = win.savedScroll
      win.savedScroll = undefined
    }
    win.pin.focus({ preventScroll: true })
  })
  win.tab = tab
  dock.append(tab)
  render(win)
  fitAll()
  if (focus) tab.focus({ preventScroll: true })
}
function setPlace(win: ReadingWindow, place: Place | "restore") {
  pin(win)
  if (!win.place && place !== "restore") win.freeRect = { ...win.rect }
  win.place = place === "restore" ? null : place
  win.rect =
    place === "restore" ? clampRect(win.freeRect, viewport()) : placeRect(place, viewport())
  closeMenu(win)
  render(win)
  front(win)
  win.layoutButton.focus({ preventScroll: true })
}
function gesture(win: ReadingWindow, handle: HTMLElement, edge: string, event: PointerEvent) {
  if (event.button !== 0 || (event.target as Element).closest("button")) return
  handle = (event.target as Element).closest<HTMLElement>(".rw-title") ?? handle
  event.preventDefault()
  finishGesture?.()
  front(win)
  const start = { ...win.rect },
    origin = { x: event.clientX, y: event.clientY }
  const events = new AbortController()
  let frame = 0,
    moved = false,
    finished = false
  let point = origin
  handle.setPointerCapture(event.pointerId)
  const draw = () => {
    frame = 0
    const dx = point.x - origin.x,
      dy = point.y - origin.y
    if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return
    moved = true
    pin(win)
    win.place = null
    win.element.classList.add("rw-moving")
    win.rect = edge
      ? resizeRect(start, edge, dx, dy, viewport())
      : clampRect({ ...start, x: start.x + dx, y: start.y + dy }, viewport())
    win.freeRect = { ...win.rect }
    render(win)
  }
  const finish = () => {
    if (finished) return
    finished = true
    if (frame) {
      cancelAnimationFrame(frame)
      draw()
    }
    if (moved) {
      const suppress = (click: MouseEvent) => {
        click.preventDefault()
        click.stopImmediatePropagation()
      }
      handle.addEventListener("click", suppress, { capture: true, once: true })
      setTimeout(() => handle.removeEventListener("click", suppress, true), 0)
    }
    events.abort()
    win.element.classList.remove("rw-moving")
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId)
    finishGesture = undefined
  }
  finishGesture = finish
  handle.addEventListener(
    "pointermove",
    (move) => {
      point = { x: move.clientX, y: move.clientY }
      if (!frame) frame = requestAnimationFrame(draw)
    },
    { signal: events.signal },
  )
  handle.addEventListener("pointerup", finish, { signal: events.signal })
  handle.addEventListener("pointercancel", finish, { signal: events.signal })
  handle.addEventListener("lostpointercapture", finish, { signal: events.signal })
}

function open(link: HTMLAnchorElement, keyboard = false, saved?: SavedWindow) {
  if (!desktop.matches || (!saved && !link.isConnected)) return
  // Pin the parent before dismissing a temporary preview containing this link.
  const parent = windows.find((win) => win.element.contains(link))
  if (parent) pin(parent)
  closeTransient()
  const existing = windows.find((win) => win.title.href === link.href)
  if (existing) {
    if (keyboard) {
      existing.tab?.click()
      front(existing)
      existing.pin.focus()
    }
    return
  }
  const id = ++nextId
  const element = document.createElement("section")
  element.className = "popover rw-window"
  element.setAttribute("role", "dialog")
  element.setAttribute("aria-modal", "false")
  const header = document.createElement("header")
  header.className = "rw-titlebar"
  const title = document.createElement("a")
  title.id = `rw-title-${id}`
  title.href = link.href
  title.dataset.noPopover = "true"
  title.textContent = link.textContent?.trim() || "Önizleme"
  title.title = "Sayfayı aç"
  title.className = "rw-title"
  element.setAttribute("aria-labelledby", title.id)
  const layoutButton = button("Pencereyi yerleştir", "layout")
  layoutButton.setAttribute("aria-expanded", "false")
  const pinButton = button("Pencereyi sabitle", "pin")
  const minimizeButton = button("Alta küçült", "minimize")
  const closeButton = button("Pencereyi kapat", "close")
  header.append(title, pinButton, layoutButton, minimizeButton, closeButton)
  const menu = document.createElement("div")
  menu.className = "rw-places"
  menu.hidden = true
  menu.id = `rw-places-${id}`
  menu.setAttribute("role", "group")
  menu.setAttribute("aria-label", "Pencere yerleşimi")
  layoutButton.setAttribute("aria-controls", menu.id)
  const inner = document.createElement("div")
  inner.className = "popover-inner rw-content"
  inner.tabIndex = 0
  inner.setAttribute("aria-busy", "true")
  inner.textContent = "Yükleniyor…"
  element.append(header, menu, inner)
  const box = link.getBoundingClientRect()
  const rect = clampRect(
    { x: box.right + 8, y: box.top - host.getBoundingClientRect().top, width: 480, height: 440 },
    viewport(),
  )
  const win: ReadingWindow = {
    id,
    element,
    inner,
    title,
    pin: pinButton,
    menu,
    layoutButton,
    anchor: link,
    request: new AbortController(),
    rect: saved ? clampRect(saved.rect, viewport()) : rect,
    freeRect: saved?.freeRect ?? { ...rect },
    pinned: !!saved,
    minimized: false,
    place: saved?.place ?? null,
    loaded: false,
    savedScroll: saved?.scrollTop,
  }
  const places: [Place | "restore", string, string][] = [
    ["top-left", "Sol üst", "↖"],
    ["top", "Üst yarı", "↑"],
    ["top-right", "Sağ üst", "↗"],
    ["left", "Sol yarı", "←"],
    ["full", "Ekranı kapla", "⛶"],
    ["right", "Sağ yarı", "→"],
    ["bottom-left", "Sol alt", "↙"],
    ["bottom", "Alt yarı", "↓"],
    ["bottom-right", "Sağ alt", "↘"],
    ["restore", "Önceki boyut", "Geri al"],
  ]
  for (const [place, label, symbol] of places) {
    const control = document.createElement("button")
    control.type = "button"
    control.textContent = symbol
    control.title = label
    control.setAttribute("aria-label", label)
    control.addEventListener("click", () => setPlace(win, place))
    menu.append(control)
  }
  layoutButton.addEventListener("click", () => {
    menu.hidden = !menu.hidden
    layoutButton.setAttribute("aria-expanded", String(!menu.hidden))
    if (!menu.hidden) menu.querySelector("button")?.focus()
  })
  pinButton.addEventListener("click", () => {
    if (win.pinned) {
      closeTransient()
      win.pinned = false
      transient = win
      render(win)
    } else pin(win)
  })
  closeButton.addEventListener("click", () => close(win, true))
  minimizeButton.addEventListener("click", () => minimize(win))
  header.addEventListener("pointerdown", (event) => gesture(win, header, "", event))
  for (const edge of ["n", "s", "e", "w", "ne", "nw", "se", "sw"]) {
    const handle = document.createElement("div")
    handle.className = `rw-resize rw-${edge}`
    handle.setAttribute("aria-hidden", "true")
    handle.addEventListener("pointerdown", (event) => gesture(win, handle, edge, event))
    element.append(handle)
  }
  windows.push(win)
  if (!saved) transient = win
  host.append(element)
  render(win)
  front(win)
  if (keyboard) pinButton.focus({ preventScroll: true })
  if (saved?.minimized) minimize(win, false)
  else void fill(win)
}

async function fill(win: ReadingWindow) {
  const { inner, title, element } = win
  inner.setAttribute("aria-busy", "true")
  inner.textContent = "Yükleniyor…"
  try {
    const content = await loadPreview(new URL(title.href), `rw-${win.id}-`, win.request.signal)
    if (win.request.signal.aborted || !windows.includes(win)) return
    title.textContent = content.title
    element.title = ""
    if (win.tab) {
      win.tab.textContent = content.title
      win.tab.title = `${content.title} — geri aç`
    }
    inner.replaceChildren(content.fragment)
    win.loaded = true
    inner.removeAttribute("aria-busy")
    markLinks(inner)
    requestAnimationFrame(() => {
      if (!windows.includes(win) || win.minimized) return
      if (win.savedScroll !== undefined) {
        inner.scrollTop = win.savedScroll
        win.savedScroll = undefined
      } else if (content.target instanceof HTMLElement && inner.contains(content.target))
        inner.scrollTop =
          content.target.getBoundingClientRect().top -
          inner.getBoundingClientRect().top +
          inner.scrollTop -
          12
    })
  } catch {
    if (win.request.signal.aborted) return
    inner.removeAttribute("aria-busy")
    inner.textContent = "Önizleme yüklenemedi. Başlığa tıklayarak sayfayı açabilirsiniz. "
    const retry = document.createElement("button")
    retry.type = "button"
    retry.textContent = "Tekrar dene"
    retry.addEventListener("click", () => {
      void fill(win)
    })
    inner.append(retry)
  }
}

const selector =
  "a.cx-row[href], article a.internal[href], .backlinks a.internal[href], .rw-content a.internal[href]"
function eligible(link: HTMLAnchorElement) {
  if (
    !link.matches(selector) ||
    link.matches("[download],.tag-link,.rw-title") ||
    link.closest(".quran-toolbar")
  )
    return false
  if (
    !link.matches(".cx-row") &&
    (originals.has(link) ? originals.get(link) : link.dataset.noPopover) === "true"
  )
    return false
  const url = new URL(link.href)
  // Leave attachment viewers (PDF/audio/video) with Quartz's stock provider.
  if (/\.(pdf|mp3|mp4|webm|ogg|wav)$/i.test(url.pathname)) return false
  return url.origin === location.origin && /^https?:$/.test(url.protocol)
}
function mark(link: HTMLAnchorElement) {
  // Raflar already opts out of stock popovers. Do not retain its rebuilt rows.
  if (link.dataset.noPopover === "true" && !originals.has(link)) return
  if (!originals.has(link)) originals.set(link, link.dataset.noPopover)
  link.dataset.noPopover = "true"
}
function markLinks(root: Document | HTMLElement = document) {
  if (!desktop.matches) return
  root.querySelectorAll<HTMLAnchorElement>(selector).forEach((link) => {
    if (eligible(link)) mark(link)
  })
}
function restoreLinks() {
  originals.forEach((value, link) => {
    if (value === undefined) delete link.dataset.noPopover
    else link.dataset.noPopover = value
  })
  originals.clear()
}
function targetLink(target: EventTarget | null) {
  const link = target instanceof Element ? target.closest<HTMLAnchorElement>("a[href]") : null
  return link && eligible(link) ? link : undefined
}
// Suppress only the stock preview for links handled here. Click/Enter stay native.
document.addEventListener(
  "mouseenter",
  (event) => {
    if (!desktop.matches) return
    const link = targetLink(event.target)
    if (link) mark(link)
  },
  true,
)
document.addEventListener("pointerover", (event) => {
  if (!desktop.matches || event.pointerType === "touch" || finishGesture) return
  const target = event.target as Node
  if (transient?.element.contains(target) || transient?.anchor.contains(target))
    clearTimeout(closeTimer)
  const link = targetLink(event.target)
  if (!link || link.contains(event.relatedTarget as Node | null)) return
  mark(link)
  if (transient?.anchor === link) return
  clearTimeout(openTimer)
  pendingLink = link
  openTimer = window.setTimeout(() => {
    pendingLink = undefined
    void open(link)
  }, 250)
})
document.addEventListener("pointerout", (event) => {
  if (
    pendingLink?.contains(event.target as Node) &&
    !pendingLink.contains(event.relatedTarget as Node | null)
  ) {
    clearTimeout(openTimer)
    pendingLink = undefined
  }
  if (!transient || finishGesture) return
  const to = event.relatedTarget as Node | null
  if (transient.element.contains(to) || transient.anchor.contains(to)) return
  if (
    !transient.element.contains(event.target as Node) &&
    !transient.anchor.contains(event.target as Node)
  )
    return
  clearTimeout(closeTimer)
  closeTimer = window.setTimeout(() => {
    if (transient && !transient.element.contains(document.activeElement)) close(transient)
  }, 180)
})
document.addEventListener(
  "pointerdown",
  (event) => {
    const win = windows.find((item) => item.element.contains(event.target as Node))
    windows.forEach((item) => {
      if (
        !item.menu.contains(event.target as Node) &&
        !item.layoutButton.contains(event.target as Node)
      )
        closeMenu(item)
    })
    if (win) front(win)
    else if (!dock.contains(event.target as Node)) closeTransient()
  },
  true,
)
document.addEventListener(
  "keydown",
  (event) => {
    if (!desktop.matches || event.isComposing || event.defaultPrevented) return
    const link = targetLink(event.target)
    if (
      event.code === "Space" &&
      link &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !event.shiftKey &&
      !event.repeat
    ) {
      event.preventDefault()
      event.stopImmediatePropagation()
      void open(link, true)
      return
    }
    if (event.key !== "Escape") return
    const win =
      windows.find((item) => !item.minimized && item.element.contains(event.target as Node)) ??
      transient
    if (!win) return
    event.preventDefault()
    event.stopImmediatePropagation()
    if (!win.menu.hidden) {
      closeMenu(win)
      win.layoutButton.focus()
    } else close(win, true)
  },
  true,
)
document.addEventListener("focusin", (event) => {
  if (
    transient &&
    !transient.element.contains(event.target as Node) &&
    event.target !== transient.anchor
  )
    closeTransient()
})
document.addEventListener("reading-preview-close", closeTransient)
document.addEventListener(
  "scroll",
  (event) => {
    if (!(event.target instanceof Node) || !host.contains(event.target)) closeTransient()
    else scheduleSave()
  },
  true,
)
document.addEventListener("prenav", () => {
  finishGesture?.()
  closeTransient()
  restoreLinks()
  host.remove()
})
document.addEventListener("nav", () => {
  document.body.append(host)
  markLinks()
  fitAll()
})
document.addEventListener("render", () => markLinks())
// One observer accounts for font/zoom changes and the tray's horizontal scrollbar.
// A shared offset keeps page navigation controls above the tray as well.
let dockHeight = -1
const dockObserver = new ResizeObserver(() => {
  const height = dock.offsetHeight
  if (height === dockHeight) return
  dockHeight = height
  document.documentElement.style.setProperty("--rw-dock-height", `${height}px`)
  fitAll()
})
dockObserver.observe(dock)
// The available area changes when the ticker, reading mode or font size changes.
const hostObserver = new ResizeObserver(() => fitAll())
hostObserver.observe(host)
window.addEventListener("resize", () => {
  finishGesture?.()
  closeTransient()
  fitAll()
})
window.addEventListener("blur", () => finishGesture?.())
window.addEventListener("pagehide", saveSession)
document.addEventListener("visibilitychange", () => {
  if (document.hidden) saveSession()
})
desktop.addEventListener("change", () => {
  if (!desktop.matches) {
    // Keep pinned windows in memory when switching input modes.
    closeTransient()
    host.hidden = true
    restoreLinks()
  } else {
    host.hidden = false
    restoreSession()
    markLinks()
    fitAll()
  }
})
function restoreSession() {
  if (!desktop.matches || sessionRestored) return
  sessionRestored = true
  restoring = true
  try {
    for (const saved of readSession(sessionStorage, location.origin)) {
      const link = document.createElement("a")
      link.href = saved.url
      link.textContent = saved.title
      open(link, false, saved)
    }
    fitAll()
  } catch {
    /* Denied storage should not disable previews. */
  } finally {
    restoring = false
  }
}
restoreSession()
markLinks()
