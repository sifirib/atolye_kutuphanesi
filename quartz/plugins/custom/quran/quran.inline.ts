import { resolveBasePath } from "@quartz-community/utils/path"
import type { SurahEntry } from "./catalog"
import { loadQuranCatalog } from "./catalog-client"

type QuranView = "both" | "arabic" | "translation"
let catalog: SurahEntry[] = []
let initializedJumps = new WeakSet<Element>()

function initializeJump(form: HTMLFormElement) {
  if (form.hidden || initializedJumps.has(form)) return
  initializedJumps.add(form)
  const page = window.location.pathname
  void loadQuranCatalog().then((entries) => {
    catalog = entries
    if (!form.isConnected || window.location.pathname !== page) return
    const select = form.querySelector<HTMLSelectElement>("select")!
    select.replaceChildren(...entries.map((entry) => {
      const option = document.createElement("option")
      option.value = entry.slug
      option.textContent = `${entry.number} · ${entry.name}`
      return option
    }))
    select.value = form.dataset.quranSlug!
    select.disabled = false
  }).catch(() => {
    if (!form.isConnected || window.location.pathname !== page) return
    const select = form.querySelector<HTMLSelectElement>("select")!
    const current = document.createElement("option")
    current.value = form.dataset.quranSlug!
    current.textContent = "Bu sure (liste yüklenemedi)"
    select.replaceChildren(current)
    select.disabled = true
    initializedJumps.delete(form)
  })
}

const storageKey = "atolye.quran.view"
let view: QuranView = "both"
try {
  const stored = localStorage.getItem(storageKey)
  if (stored === "both" || stored === "arabic" || stored === "translation") view = stored
} catch {
  // Reading remains available when browser storage is disabled.
}

let initialized = new WeakSet<Element>()

function setExpanded(verse: HTMLElement, expanded: boolean) {
  const translation = verse.querySelector<HTMLElement>(".quran-translation")
  const button = verse.querySelector<HTMLButtonElement>(".quran-toggle")
  if (translation) translation.hidden = !expanded
  if (button) {
    button.setAttribute("aria-expanded", String(expanded))
    button.setAttribute("aria-label", `${button.dataset.verseNumber}. ayetin mealini ${expanded ? "gizle" : "göster"}`)
  }
}

function applyView(verse: HTMLElement) {
  verse.dataset.quranMode = view
  const arabic = verse.querySelector<HTMLElement>(".quran-arabic")
  const button = verse.querySelector<HTMLButtonElement>(".quran-toggle")
  if (arabic) arabic.hidden = view === "translation"
  if (button) button.hidden = view === "translation"
  setExpanded(verse, view !== "arabic")
}

function updateToolbar(toolbar: HTMLElement) {
  toolbar.hidden = false
  toolbar.dataset.quranView = view
  toolbar.querySelectorAll<HTMLButtonElement>("button[data-quran-mode]").forEach((button) => {
    const selected = button.dataset.quranMode
    const enabled = view === "both" || selected === view
    const lastVisible = enabled && view !== "both"
    button.setAttribute("aria-pressed", String(enabled))
    button.setAttribute("aria-disabled", String(lastVisible))
    button.title = lastVisible
      ? "En az bir metin görünür kalmalı"
      : `${selected === "arabic" ? "Arapça metni" : "Türkçe meali"} ${enabled ? "gizle" : "göster"}`
  })
  const jump = toolbar.querySelector<HTMLFormElement>(".quran-jump")
  // Copied toolbars in previews/transclusions must not navigate the host page.
  if (jump) {
    jump.hidden = !toolbar.closest(".center > article") || !!toolbar.closest(".transclude, .popover")
    initializeJump(jump)
  }
}

function initialize() {
  document.querySelectorAll<HTMLElement>(".quran-verse").forEach((verse) => {
    if (initialized.has(verse)) return
    initialized.add(verse)
    applyView(verse)
  })
  document.querySelectorAll<HTMLElement>(".quran-toolbar").forEach(updateToolbar)
}

function syncVerseTarget() {
  // SPA morphing can reuse numeric IDs across surahs. Derive the highlight
  // from the current URL rather than the browser's retained :target element.
  document.querySelectorAll(".quran-verse[data-quran-target]").forEach((verse) => {
    verse.removeAttribute("data-quran-target")
  })
  let id: string
  try { id = decodeURIComponent(window.location.hash.slice(1)) } catch { return }
  if (!id) return
  const verse = Array.from(document.querySelectorAll<HTMLElement>(".center > article .quran-verse[id]"))
    .find((item) => item.id === id && !item.closest(".transclude, .popover"))
  if (verse) verse.dataset.quranTarget = "true"
}

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return
  const button = event.target.closest<HTMLButtonElement>(".quran-toolbar button[data-quran-mode]")
  if (!button) return
  const selected = button.dataset.quranMode
  if (selected !== "arabic" && selected !== "translation") return
  if (view === selected) return
  view = view === "both" ? (selected === "arabic" ? "translation" : "arabic") : "both"
  try {
    localStorage.setItem(storageKey, view)
  } catch {
    // Keep the selection for this session even if persistence is unavailable.
  }
  document.querySelectorAll<HTMLElement>(".quran-verse").forEach(applyView)
  document.querySelectorAll<HTMLElement>(".quran-toolbar").forEach(updateToolbar)
})

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return
  const toggle = event.target.closest<HTMLButtonElement>(".quran-toggle")
  const verse = toggle?.closest<HTMLElement>(".quran-verse")
  if (toggle && verse) setExpanded(verse, toggle.getAttribute("aria-expanded") !== "true")
})

document.addEventListener("input", (event) => {
  if (event.target instanceof HTMLInputElement && event.target.closest(".quran-jump")) {
    event.target.setCustomValidity("")
  }
})

document.addEventListener("change", (event) => {
  if (!(event.target instanceof HTMLSelectElement) || !event.target.closest(".quran-jump")) return
  const input = event.target.form?.querySelector<HTMLInputElement>("input")
  if (input) {
    input.value = ""
    input.setCustomValidity("")
  }
})

document.addEventListener("submit", (event) => {
  const form = event.target
  if (!(form instanceof HTMLFormElement) || !form.matches(".quran-jump")) return
  event.preventDefault()
  if (form.hidden) return
  const article = form.closest<HTMLElement>(".center > article")
  const input = form.querySelector<HTMLInputElement>("input")!
  if (!article) return
  const verses = Array.from(article.querySelectorAll<HTMLElement>(".quran-verse[id]"))
    .filter((verse) => !verse.closest(".transclude, .popover"))
  const number = Number(input.value)
  const selected = form.querySelector<HTMLSelectElement>("select")!.value
  if (selected !== form.dataset.quranSlug) {
    const target = catalog.find((entry) => entry.slug === selected)
    if (!target || !target.verses.includes(number)) {
      input.setCustomValidity("Seçilen surede bu numarada bir ayet yok.")
      input.reportValidity()
      return
    }
    const url = new URL(resolveBasePath(target.slug), window.location.href)
    url.hash = String(number)
    if (window.spaNavigate) void window.spaNavigate(url)
    else window.location.assign(url)
    return
  }
  const verse = verses.find((item) => item.id === String(number))
  if (!Number.isInteger(number) || !verse) {
    input.setCustomValidity("Bu surede bu numarada bir ayet yok.")
    input.reportValidity()
    return
  }
  input.setCustomValidity("")
  // Keep the existing block ID and native fragment history, including Back.
  window.location.hash = verse.id
  syncVerseTarget()
  verse.tabIndex = -1
  verse.focus({ preventScroll: true })
  verse.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })
})

document.addEventListener("prenav", () => {
  const focused = document.activeElement
  if (focused instanceof HTMLElement && focused.matches(".quran-verse")) focused.blur()
})

window.addEventListener("hashchange", syncVerseTarget)
document.addEventListener("nav", () => {
  // SPA navigation can reuse verse elements while restoring their server-side
  // attributes (including hidden). Reapply the view after every completed nav.
  initialized = new WeakSet<Element>()
  initializedJumps = new WeakSet<Element>()
  document.querySelectorAll<HTMLInputElement>(".quran-jump input").forEach((input) => {
    input.value = ""
    input.setCustomValidity("")
  })
  initialize()
  syncVerseTarget()
})
// Popovers and block transclusions may be inserted after the page has loaded.
const observer = new MutationObserver((records) => {
  if (records.some((record) => Array.from(record.addedNodes).some(
    (node) => node instanceof Element && (node.matches(".quran-verse, .quran-toolbar") || node.querySelector(".quran-verse, .quran-toolbar")),
  ))) initialize()
})
observer.observe(document.documentElement, { childList: true, subtree: true })
initialize()
syncVerseTarget()

export {}
