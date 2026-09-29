import { getFullSlug, resolveBasePath, simplifySlug } from "@quartz-community/utils/path"
import { buildExplorerModel, canSearchFolder, folderPath, type ExplorerModel, type ExplorerNode } from "./model"
import { createSearchIndex, normalizeQuery, searchExplorer, type SearchEntry } from "./search"
import { setupPreview } from "./preview"
import { readPins } from "./pins"

// Keep mouse-driven desktops in column mode even when DevTools narrows the
// viewport. Narrow touch layouts retain the existing mobile Explorer for now.
const desktop = window.matchMedia("(min-width: 801px), (hover: hover) and (pointer: fine)")
let modelPromise: Promise<ExplorerModel> | undefined
let sharedIndexUsed = false
let disposeCurrent = () => {}
const pinsKey = `raf-pins:${new URL(resolveBasePath("static/contentIndex.json"), location.href).pathname}`
let pinned = new Set<string>()
try { pinned = readPins(localStorage.getItem(pinsKey)) } catch { /* Use memory if storage is blocked. */ }

function getModel(): Promise<ExplorerModel> {
  if (modelPromise) return modelPromise
  const source = sharedIndexUsed
    ? fetch(resolveBasePath("static/contentIndex.json")).then((response) => {
        if (!response.ok) throw new Error(`Content index: ${response.status}`)
        return response.json()
      })
    : fetchData
  sharedIndexUsed = true
  modelPromise = source.then(buildExplorerModel).catch((error: unknown) => {
    modelPromise = undefined
    throw error
  })
  return modelPromise
}

function mount() {
  disposeCurrent()
  const host = document.querySelector<HTMLElement>(".cx-explorer")
  if (!host) return
  const columns = host.querySelector<HTMLElement>(".cx-columns")!
  const rootBody = host.querySelector<HTMLElement>(".cx-root-body")!
  const searchInput = host.querySelector<HTMLInputElement>(".cx-search-input")!
  const searchSummary = host.querySelector<HTMLElement>(".cx-search-summary")!
  const searchOpen = host.querySelector<HTMLButtonElement>(".cx-search-open")!
  const searchBox = host.querySelector<HTMLElement>(".cx-search")!
  const rootTitle = host.querySelector<HTMLElement>(".cx-root-title")!
  const pinStatus = host.querySelector<HTMLElement>(".cx-pin-status")!
  pinStatus.textContent = ""
  // SPA navigation can reuse DOM attributes from the previous page.
  searchBox.hidden = true
  rootTitle.hidden = false
  searchInput.value = ""
  searchSummary.hidden = true
  searchInput.disabled = true
  searchOpen.disabled = true
  searchOpen.setAttribute("aria-expanded", "false")
  const events = new AbortController()
  let panelEvents = new AbortController()
  const panel = document.createElement("div")
  panel.className = "cx-flyout"
  panel.setAttribute("role", "region")
  panel.setAttribute("aria-label", "Alt klasörler")
  panel.hidden = true
  // A body-level layer avoids clipping by the theme's sidebar overflow rules.
  document.body.append(panel)
  const preview = setupPreview(host, panel, () => desktop.matches && host.dataset.cxPopovers === "true")
  let disposed = false
  let model: ExplorerModel | undefined
  let loading = false
  let opened: string[] = []
  let visible = false
  let positioning = 0
  let searchTimer = 0
  let searchIndex: SearchEntry[] = []
  let matches: SearchEntry[] = []
  let searching = false
  let resultLimit = 40
  let rootList: HTMLUListElement | undefined
  let rootScroll = 0
  let reopenAfterSearch = false
  const scrollPositions = new Map<string, number>()
  const activeSlug = simplifySlug(getFullSlug(window)).replace(/\/$/, "")
  let activeFolders = new Set<string>()

  function href(node: ExplorerNode) {
    return resolveBasePath(node.folder ? `${node.id}/` : simplifySlug(node.id))
  }

  function link(label: string, node: ExplorerNode) {
    const anchor = document.createElement("a")
    anchor.textContent = label
    anchor.href = href(node)
    anchor.className = "internal"
    anchor.dataset.noPopover = "true"
    return anchor
  }

  function icon(folder: boolean) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    svg.setAttribute("viewBox", "0 0 24 24")
    svg.setAttribute("aria-hidden", "true")
    const path = document.createElementNS(svg.namespaceURI, "path")
    path.setAttribute("d", folder
      ? "M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v11H3Z"
      : "M6 3h8l4 4v14H6ZM14 3v5h4")
    svg.append(path)
    return svg
  }

  function makeRow(node: ExplorerNode, path?: string) {
    const row = node.folder ? document.createElement("button") : link("", node)
    row.className = "cx-row"
    row.dataset.cxNode = node.id
    row.title = path ? `${path} › ${node.name}` : node.name
    if (row instanceof HTMLButtonElement) {
      row.type = "button"
      row.dataset.cxFolder = node.id
      row.setAttribute("aria-expanded", "false")
      if (activeFolders.has(node.id)) {
        row.classList.add("cx-current-ancestor")
        row.setAttribute("aria-label", `${node.name}: açık sayfanın bulunduğu klasör`)
        row.title += " · Açık sayfanın bulunduğu klasör"
      }
    } else if (node.id === activeSlug) row.setAttribute("aria-current", "page")
    const name = document.createElement("span")
    name.className = "cx-name"
    name.textContent = node.name
    row.append(icon(node.folder))
    if (path !== undefined) {
      row.dataset.cxResult = "true"
      const text = document.createElement("span")
      text.className = "cx-result-text"
      const location = document.createElement("span")
      location.className = "cx-result-path"
      location.textContent = path
      text.append(name, location)
      row.append(text)
    } else row.append(name)
    if (node.folder) {
      const arrow = document.createElement("span")
      arrow.className = "cx-chevron"
      arrow.setAttribute("aria-hidden", "true")
      row.append(arrow)
    }
    return row
  }

  function makeList(folder: ExplorerNode) {
    const list = document.createElement("ul")
    list.className = "cx-items"
    list.dataset.cxList = folder.id
    list.setAttribute("aria-label", folder.name)
    if (!folder.id && model) {
      const favorites = [...pinned].map((id) => model!.nodes.get(id))
        .filter((node): node is ExplorerNode => !!node)
      if (favorites.length) {
        const pinnedHeading = document.createElement("li")
        pinnedHeading.className = "cx-list-heading"
        pinnedHeading.textContent = "Sabitlenenler"
        list.append(pinnedHeading)
        favorites.forEach((node) => {
          const entry = searchIndex.find((item) => item.node.id === node.id)
          const item = makeItem(node, entry?.path)
          item.dataset.cxPinned = "true"
          list.append(item)
        })
        const heading = document.createElement("li")
        heading.className = "cx-list-heading"
        heading.textContent = "Tüm raflar"
        list.append(heading)
      }
    }
    if (!folder.children.length) {
      const empty = document.createElement("li")
      empty.className = "cx-status"
      empty.textContent = "Bu klasör boş."
      list.append(empty)
    }
    folder.children.forEach((node) => {
      list.append(makeItem(node))
    })
    return list
  }

  function updatePin(button: HTMLButtonElement) {
    const selected = pinned.has(button.dataset.cxPin!)
    const name = model?.nodes.get(button.dataset.cxPin!)?.name ?? "Öğe"
    button.setAttribute("aria-pressed", String(selected))
    button.setAttribute("aria-label", `${name}: ${selected ? "sabitlemeyi kaldır" : "sabitle"}`)
    button.title = selected ? "Sabitlemeyi kaldır" : "Sabitle"
  }

  function makeItem(node: ExplorerNode, path?: string) {
    const item = document.createElement("li")
    const entry = document.createElement("div")
    entry.className = "cx-entry"
    const button = document.createElement("button")
    button.type = "button"
    button.className = "cx-pin"
    button.dataset.cxPin = node.id
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    svg.setAttribute("viewBox", "0 0 24 24")
    svg.setAttribute("aria-hidden", "true")
    const pin = document.createElementNS(svg.namespaceURI, "path")
    pin.setAttribute("d", "M9 3h6l-1 6 4 4v2H6v-2l4-4ZM12 15v6")
    svg.append(pin)
    button.append(svg)
    updatePin(button)
    entry.append(makeRow(node, path), button)
    item.append(entry)
    return item
  }

  function refreshPins() {
    if (!model) return
    // Match both the node and its section: a pinned item can also appear below.
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const entry = focused?.closest<HTMLElement>(".cx-entry")
    const entries = Array.from(rootList?.querySelectorAll<HTMLElement>(".cx-entry") ?? [])
    const index = entry ? entries.indexOf(entry) : -1
    const id = entry?.querySelector<HTMLElement>(".cx-row")?.dataset.cxNode
    const wasPinned = entry?.parentElement?.hasAttribute("data-cx-pinned")
    const wasPin = focused?.matches(".cx-pin")
    const scroll = rootList?.scrollTop ?? 0
    rootList = makeList(model.root)
    if (!searching) {
      preview.close()
      rootBody.replaceChildren(rootList)
      rootList.scrollTop = scroll
      if (index >= 0) {
        const nextEntries = Array.from(rootList.querySelectorAll<HTMLElement>(".cx-entry"))
        const replacement = nextEntries.find((item) =>
          item.querySelector<HTMLElement>(".cx-row")?.dataset.cxNode === id
          && item.parentElement?.hasAttribute("data-cx-pinned") === wasPinned,
        ) ?? nextEntries[Math.min(index, nextEntries.length - 1)]
        ;(replacement?.querySelector<HTMLElement>(wasPin ? ".cx-pin" : ".cx-row") ?? searchOpen)
          .focus({ preventScroll: true })
      }
    }
    for (const area of [rootBody, panel]) {
      area.querySelectorAll<HTMLButtonElement>("[data-cx-pin]").forEach(updatePin)
    }
    updateSelection()
    schedulePosition()
  }

  function togglePin(button: HTMLElement) {
    const id = button.dataset.cxPin!
    if (!model?.nodes.has(id)) return
    if (pinned.has(id)) pinned.delete(id)
    else pinned.add(id)
    let saved = true
    try { localStorage.setItem(pinsKey, JSON.stringify([...pinned])) } catch { saved = false }
    pinStatus.textContent = `${model.nodes.get(id)!.name}: ${pinned.has(id) ? "sabitlendi" : "sabitleme kaldırıldı"}.`
      + (saved ? "" : " Tarayıcı kaydetmeye izin vermedi; seçim yalnızca bu oturumda tutuluyor.")
    refreshPins()
  }

  function clearSearch(restorePanel = true) {
    window.clearTimeout(searchTimer)
    searchInput.value = ""
    searchSummary.hidden = true
    if (searching && rootList) {
      rootBody.replaceChildren(rootList)
      rootList.scrollTop = rootScroll
    }
    searching = false
    if (restorePanel && reopenAfterSearch && desktop.matches) renderPanel()
    reopenAfterSearch = false
    schedulePosition()
  }

  function closeSearch(restorePanel = true, restoreFocus = true) {
    clearSearch(restorePanel)
    searchBox.hidden = true
    rootTitle.hidden = false
    searchOpen.setAttribute("aria-expanded", "false")
    if (restoreFocus) searchOpen.focus({ preventScroll: true })
  }

  function openSearch() {
    preview.close()
    rootTitle.hidden = true
    searchBox.hidden = false
    searchOpen.setAttribute("aria-expanded", "true")
    searchInput.focus({ preventScroll: true })
    schedulePosition()
  }

  function makeResults(entries: SearchEntry[], limit: number, summary: HTMLElement) {
    const list = document.createElement("ul")
    list.className = "cx-items cx-results"
    list.setAttribute("aria-label", "Arama sonuçları")
    const shown = Math.min(limit, entries.length)
    summary.hidden = false
    summary.textContent = entries.length === 0
      ? "Sonuç bulunamadı."
      : shown < entries.length ? `${entries.length} sonuç · ${shown} gösteriliyor` : `${entries.length} sonuç`
    for (const entry of entries.slice(0, shown)) {
      list.append(makeItem(entry.node, entry.path))
    }
    if (!entries.length) {
      const empty = document.createElement("li")
      empty.className = "cx-status"
      empty.textContent = "Dosya adının bir bölümünü veya klasör adını deneyebilirsin."
      list.append(empty)
    }
    if (shown < entries.length) {
      const item = document.createElement("li")
      const more = document.createElement("button")
      more.type = "button"
      more.className = "cx-more"
      more.dataset.cxMore = "true"
      more.textContent = "Daha fazla göster"
      item.append(more)
      list.append(item)
    }
    return list
  }

  function renderResults(keepScroll = false) {
    const previousScroll = keepScroll ? rootBody.querySelector(".cx-items")?.scrollTop ?? 0 : 0
    const list = makeResults(matches, resultLimit, searchSummary)
    rootBody.replaceChildren(list)
    list.scrollTop = previousScroll
    schedulePosition()
  }

  function runSearch() {
    if (disposed || !model || !desktop.matches) return
    if (!normalizeQuery(searchInput.value)) {
      clearSearch()
      return
    }
    if (!searching) {
      rootScroll = rootList?.scrollTop ?? 0
      reopenAfterSearch = visible
      searching = true
    }
    closePanel(false)
    matches = searchExplorer(searchIndex, searchInput.value)
    resultLimit = 40
    renderResults()
  }

  function updateSelection() {
    columns.classList.toggle("cx-panel-open", visible)
    for (const area of [rootBody, panel]) {
      area.querySelectorAll<HTMLElement>("[data-cx-folder]").forEach((row) => {
        const selected = opened.includes(row.dataset.cxFolder!)
        row.classList.toggle("cx-selected", selected)
        row.setAttribute("aria-expanded", String(visible && selected))
      })
    }
  }

  function position() {
    positioning = 0
    if (disposed || !desktop.matches) return
    const bounds = columns.getBoundingClientRect()
    const rootBounds = rootBody.getBoundingClientRect()
    const height = Math.max(80, Math.min(560, window.innerHeight - rootBounds.top - 20))
    rootBody.style.height = `${height}px`
    if (!visible) return
    const available = Math.max(0, window.innerWidth - bounds.right - 16)
    if (bounds.bottom < 0 || bounds.top >= window.innerHeight) {
      closePanel(false)
      return
    }
    // With a narrow desktop viewport, use an in-viewport overlay rather than
    // dropping back to the tree or leaving only a sliver of a column visible.
    const overlay = available < Math.min(220, bounds.width)
    const left = overlay ? Math.max(12, Math.min(bounds.left, window.innerWidth - bounds.width - 12)) : bounds.right - 1
    const room = overlay ? Math.max(80, window.innerWidth - left - 12) : available
    const width = Math.min(bounds.width, room)
    const top = Math.max(12, Math.min(bounds.top, window.innerHeight - 160))
    const panelWidth = `${Math.min(room, opened.length * width)}px`
    const resized = panel.style.width !== panelWidth
      || panel.style.getPropertyValue("--cx-column-width") !== `${width}px`
    panel.style.setProperty("--cx-column-width", `${width}px`)
    panel.style.left = `${left}px`
    panel.style.top = `${top}px`
    panel.style.width = panelWidth
    panel.style.height = `${Math.min(height + rootBounds.top - bounds.top, window.innerHeight - top - 16)}px`
    if (resized) {
      const track = panel.querySelector<HTMLElement>(".cx-track")
      const newest = track?.lastElementChild
      if (track && newest) {
        track.scrollLeft += newest.getBoundingClientRect().left - track.getBoundingClientRect().left
      }
    }
  }

  function schedulePosition() {
    if (!positioning) positioning = requestAnimationFrame(position)
  }

  function closePanel(restoreFocus: boolean) {
    preview.close()
    visible = false
    panel.hidden = true
    updateSelection()
    if (restoreFocus) {
      if (columns.hidden || !desktop.matches) {
        const fallback = Array.from(host!.querySelectorAll<HTMLElement>(".explorer button, .explorer a"))
          .find((element) => element.getClientRects().length > 0)
        fallback?.focus()
        return
      }
      const rows = rootBody.querySelectorAll<HTMLElement>("[data-cx-node]")
      const selected = Array.from(rows).find((row) => row.dataset.cxNode === opened[0])
      ;(selected ?? rows[0] ?? searchInput)?.focus()
    }
  }

  function focusFirst(folderId: string) {
    const list = Array.from(panel.querySelectorAll<HTMLElement>("[data-cx-list]")).find(
      (element) => element.dataset.cxList === folderId,
    )
    const target = list?.querySelector<HTMLElement>(".cx-row") ?? list
    // Empty folders still need a keyboard destination after their opener is rebuilt.
    if (target === list && list) list.tabIndex = -1
    target?.focus()
  }

  function addColumnSearch(section: HTMLElement, folder: ExplorerNode, crumb: HTMLElement) {
    const signal = panelEvents.signal
    const bar = document.createElement("div")
    bar.className = "cx-column-tools"
    bar.hidden = true
    const open = searchOpen.cloneNode(true) as HTMLButtonElement
    open.disabled = false
    open.removeAttribute("data-cx-search-open")
    open.setAttribute("aria-label", `${folder.name} içinde ara`)
    open.title = `${folder.name} içinde ara`
    open.setAttribute("aria-expanded", "false")
    const box = searchBox.cloneNode(true) as HTMLElement
    const input = box.querySelector<HTMLInputElement>("input")!
    input.disabled = false
    input.value = ""
    input.placeholder = `${folder.name} içinde ara…`
    input.setAttribute("aria-label", `${folder.name} ve alt klasörlerinde ara`)
    box.setAttribute("aria-label", `${folder.name} içinde ara`)
    box.hidden = true
    const summary = searchSummary.cloneNode(false) as HTMLElement
    summary.hidden = true
    const original = section.querySelector<HTMLUListElement>(".cx-items")!
    let list = original
    let timer = 0
    let limit = 40
    let savedScroll = 0
    let results: SearchEntry[] = []
    const showResults = () => {
      preview.close()
      const next = makeResults(results, limit, summary)
      next.dataset.cxList = folder.id
      next.setAttribute("aria-label", `${folder.name} içindeki arama sonuçları`)
      list.replaceWith(next)
      list = next
    }
    const restore = () => {
      window.clearTimeout(timer)
      if (list !== original) {
        list.replaceWith(original)
        original.scrollTop = savedScroll
      }
      list = original
      summary.hidden = true
    }
    const run = () => {
      window.clearTimeout(timer)
      if (!normalizeQuery(input.value)) { restore(); return }
      if (list === original) savedScroll = original.scrollTop
      results = searchExplorer(searchIndex, input.value, folder.id)
      limit = 40
      showResults()
    }
    const close = () => {
      restore()
      input.value = ""
      box.hidden = true
      bar.hidden = true
      open.setAttribute("aria-expanded", "false")
      open.focus({ preventScroll: true })
    }
    crumb.append(open)
    bar.append(box)
    section.prepend(bar, summary)
    open.addEventListener("click", (event) => {
      event.stopPropagation()
      if (!box.hidden) { close(); return }
      preview.close()
      savedScroll = original.scrollTop
      bar.hidden = false
      box.hidden = false
      open.setAttribute("aria-expanded", "true")
      const track = section.parentElement!
      track.scrollLeft += section.getBoundingClientRect().left - track.getBoundingClientRect().left
      input.focus({ preventScroll: true })
    }, { signal })
    bar.addEventListener("click", (event) => {
      event.stopPropagation()
      if ((event.target as Element).closest(".cx-search-clear")) close()
    }, { signal })
    input.addEventListener("input", (event) => {
      window.clearTimeout(timer)
      if (!(event instanceof InputEvent && event.isComposing)) timer = window.setTimeout(run, 120)
    }, { signal })
    input.addEventListener("compositionend", run, { signal })
    section.addEventListener("keydown", (event) => {
      if (event.isComposing) return
      if (event.key === "Escape" && !box.hidden) {
        event.preventDefault()
        event.stopPropagation()
        close()
      } else if (event.target === input && (event.key === "Enter" || event.key === "ArrowDown")) {
        event.preventDefault()
        event.stopPropagation()
        run()
        list.querySelector<HTMLElement>(".cx-row")?.focus()
      }
    }, { signal })
    crumb.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || box.hidden || event.isComposing) return
      event.preventDefault()
      event.stopPropagation()
      close()
    }, { signal })
    section.addEventListener("click", (event) => {
      if (!(event.target as Element).closest("[data-cx-more]")) return
      event.stopPropagation()
      const previous = limit
      const scroll = list.scrollTop
      limit += 40
      showResults()
      list.scrollTop = scroll
      list.querySelectorAll<HTMLElement>(".cx-row")[previous]?.focus({ preventScroll: true })
    }, { signal })
    signal.addEventListener("abort", () => window.clearTimeout(timer), { once: true })
  }

  function renderPanel() {
    if (!model) return
    preview.close()
    panelEvents.abort()
    panelEvents = new AbortController()
    panel.querySelectorAll<HTMLElement>("[data-cx-list]:not(.cx-results)").forEach((list) => {
      scrollPositions.set(list.dataset.cxList!, list.scrollTop)
    })
    const toolbar = document.createElement("div")
    toolbar.className = "cx-panel-toolbar"
    const crumbs = document.createElement("nav")
    crumbs.className = "cx-breadcrumbs"
    crumbs.setAttribute("aria-label", "Klasör yolu")
    const crumbItems = new Map<string, HTMLElement>()
    for (const id of ["", ...opened]) {
      const item = document.createElement("span")
      item.className = "cx-crumb"
      const button = document.createElement("button")
      button.type = "button"
      button.textContent = model.nodes.get(id)?.name ?? "Raflar"
      button.dataset.cxCrumb = id
      item.append(button)
      crumbs.append(item)
      crumbItems.set(id, item)
    }
    const close = document.createElement("button")
    close.type = "button"
    close.className = "cx-close"
    close.dataset.cxClose = "true"
    close.setAttribute("aria-label", "Alt klasörleri kapat")
    close.textContent = "×"
    toolbar.append(crumbs, close)
    const track = document.createElement("div")
    track.className = "cx-track"
    for (const id of opened) {
      const node = model.nodes.get(id)!
      const section = document.createElement("section")
      section.className = "cx-pane"
      section.setAttribute("aria-label", node.name)
      section.append(makeList(node))
      if (canSearchFolder(node)) addColumnSearch(section, node, crumbItems.get(id)!)
      track.append(section)
    }
    panel.replaceChildren(toolbar, track)
    visible = opened.length > 0
    panel.hidden = !visible
    updateSelection()
    position()
    panel.querySelectorAll<HTMLElement>("[data-cx-list]").forEach((list) => {
      const saved = scrollPositions.get(list.dataset.cxList!)
      const selected = list.querySelector<HTMLElement>(".cx-selected, [aria-current='page']")
      list.scrollTop = saved ?? (selected
        ? Math.max(0, selected.getBoundingClientRect().top - list.getBoundingClientRect().top - 60)
        : 0)
    })
    // Reveal the start of the newest column, not the far edge of its content.
    // This also keeps names readable if less than one column fits on screen.
    const newest = track.lastElementChild
    if (newest) {
      track.scrollLeft += newest.getBoundingClientRect().left - track.getBoundingClientRect().left
    }
  }

  function openFolder(id: string, keyboard = false) {
    if (!model?.nodes.get(id)?.folder) return
    if (visible || !opened.includes(id)) opened = folderPath(model, id)
    renderPanel()
    if (keyboard) focusFirst(id)
    else {
      const row = [...rootBody.querySelectorAll<HTMLElement>(".cx-row"), ...panel.querySelectorAll<HTMLElement>(".cx-row")]
        .find((element) => element.dataset.cxNode === id)
      row?.focus({ preventScroll: true })
    }
  }

  async function load() {
    if (model || loading || !desktop.matches) return
    loading = true
    rootBody.replaceChildren()
    const message = document.createElement("p")
    message.className = "cx-status"
    message.setAttribute("role", "status")
    message.textContent = "Dosyalar yükleniyor…"
    rootBody.append(message)
    try {
      const result = await getModel()
      if (disposed) return
      model = result
      activeFolders = new Set(folderPath(model, activeSlug))
      searchIndex = createSearchIndex(model)
      searchInput.disabled = false
      searchOpen.disabled = false
      searchOpen.hidden = !canSearchFolder(model.root)
      opened = folderPath(model, getFullSlug(window))
      const list = makeList(model.root)
      rootList = list
      rootBody.replaceChildren(list)
      updateSelection()
      const selected = list.querySelector<HTMLElement>(".cx-selected, [aria-current='page']")
      if (selected) list.scrollTop = Math.max(0, selected.getBoundingClientRect().top - list.getBoundingClientRect().top - 60)
      schedulePosition()
    } catch {
      if (disposed) return
      message.textContent = "Dosya listesi yüklenemedi. Yeniden deneyebilirsin."
      const retry = document.createElement("button")
      retry.type = "button"
      retry.className = "cx-retry"
      retry.dataset.cxRetry = "true"
      retry.textContent = "Yeniden dene"
      rootBody.append(retry)
    } finally {
      loading = false
    }
  }

  function applyLayout() {
    host!.dataset.cxEnabled = String(desktop.matches)
    columns.hidden = !desktop.matches
    if (!desktop.matches) closePanel(panel.contains(document.activeElement))
    else {
      void load()
      schedulePosition()
    }
  }

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return
    if (!host!.contains(event.target) && !panel.contains(event.target)) return
    const target = event.target.closest<HTMLElement>("button, a")
    if (!target) return
    if (target.hasAttribute("data-cx-pin")) togglePin(target)
    else if (target.hasAttribute("data-cx-folder")) {
      if (target.hasAttribute("data-cx-result")) {
        closeSearch(false, false)
        opened = folderPath(model!, target.dataset.cxFolder!)
      }
      openFolder(target.dataset.cxFolder!, event.detail === 0)
    } else if (target.hasAttribute("data-cx-crumb")) {
      if (target.dataset.cxCrumb === "") closePanel(true)
      else {
        opened = folderPath(model!, target.dataset.cxCrumb!)
        renderPanel()
        focusFirst(opened.at(-1)!)
      }
    } else if (target.hasAttribute("data-cx-close")) closePanel(true)
    else if (target.hasAttribute("data-cx-search-open")) openSearch()
    else if (target.hasAttribute("data-cx-clear")) closeSearch()
    else if (target.hasAttribute("data-cx-more")) {
      const nextIndex = resultLimit
      resultLimit += 40
      renderResults(true)
      rootBody.querySelectorAll<HTMLElement>(".cx-row")[nextIndex]?.focus({ preventScroll: true })
    } else if (target.hasAttribute("data-cx-retry")) void load()
    else if (target instanceof HTMLAnchorElement && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      closePanel(false)
    }
  }, { signal: events.signal })

  searchInput.addEventListener("input", (event) => {
    window.clearTimeout(searchTimer)
    if (event instanceof InputEvent && event.isComposing) return
    searchTimer = window.setTimeout(runSearch, 120)
  }, { signal: events.signal })
  searchInput.addEventListener("compositionend", runSearch, { signal: events.signal })

  document.addEventListener("pointerdown", (event) => {
    if (event.target instanceof Element && event.target.closest(".cx-preview")) return
    if (event.target instanceof Node && !host!.contains(event.target) && !panel.contains(event.target)) {
      closePanel(panel.contains(document.activeElement))
    }
  }, { signal: events.signal })

  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return
    if (!(event.target instanceof HTMLElement)) return
    if (!columns.contains(event.target) && !panel.contains(event.target)) return
    if (!searchBox.hidden && event.key === "Escape" && host!.contains(event.target as Node)) {
      event.preventDefault()
      event.stopImmediatePropagation()
      closeSearch()
      return
    }
    if (event.target === searchInput && (event.key === "ArrowDown" || event.key === "Enter")) {
      event.preventDefault()
      window.clearTimeout(searchTimer)
      if (normalizeQuery(searchInput.value)) runSearch()
      rootBody.querySelector<HTMLElement>(".cx-row")?.focus()
      return
    }
    if (event.key === "Escape" && visible) {
      event.preventDefault()
      event.stopImmediatePropagation()
      closePanel(true)
      return
    }
    const row = event.target.closest<HTMLElement>(".cx-entry")?.querySelector<HTMLElement>(".cx-row")
    const list = event.target.closest<HTMLElement>(".cx-items")
    if (event.key === "ArrowLeft" && list?.dataset.cxList) {
      event.preventDefault()
      const parentRow = [...rootBody.querySelectorAll<HTMLElement>(".cx-row"), ...panel.querySelectorAll<HTMLElement>(".cx-row")]
        .find((item) => item.dataset.cxNode === list.dataset.cxList)
      parentRow?.focus()
      return
    }
    if (!row || !list) return
    const rows = Array.from(list.querySelectorAll<HTMLElement>(".cx-row"))
    const index = rows.indexOf(row)
    let next: HTMLElement | undefined
    if (event.key === "ArrowDown") next = rows[Math.min(index + 1, rows.length - 1)]
    if (event.key === "ArrowUp") next = rows[Math.max(index - 1, 0)]
    if (event.key === "Home") next = rows[0]
    if (event.key === "End") next = rows.at(-1)
    if (next) {
      event.preventDefault()
      next.focus()
    } else if (event.key === "ArrowRight" && row.dataset.cxFolder) {
      event.preventDefault()
      if (row.hasAttribute("data-cx-result")) {
        closeSearch(false, false)
        opened = folderPath(model!, row.dataset.cxFolder)
      }
      openFolder(row.dataset.cxFolder, true)
    }
  }, { signal: events.signal })

  desktop.addEventListener("change", applyLayout, { signal: events.signal })
  window.addEventListener("storage", (event) => {
    if (event.key !== pinsKey && event.key !== null) return
    pinned = readPins(event.newValue)
    refreshPins()
  }, { signal: events.signal })
  window.addEventListener("resize", schedulePosition, { signal: events.signal })
  window.addEventListener("scroll", schedulePosition, { signal: events.signal, capture: true })
  const observer = new ResizeObserver(schedulePosition)
  observer.observe(host)

  disposeCurrent = () => {
    if (disposed) return
    disposed = true
    events.abort()
    preview.dispose()
    panelEvents.abort()
    observer.disconnect()
    cancelAnimationFrame(positioning)
    window.clearTimeout(searchTimer)
    panel.remove()
  }
  window.addCleanup?.(disposeCurrent)
  applyLayout()
}

document.addEventListener("nav", mount)
// Quartz starts its router after component scripts, then emits the first nav.
// Waiting for that event also ensures its cleanup API is available.
