type QuranView = "both" | "arabic" | "translation"

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
}

function initialize() {
  document.querySelectorAll<HTMLElement>(".quran-verse").forEach((verse) => {
    if (initialized.has(verse)) return
    initialized.add(verse)
    applyView(verse)
  })
  document.querySelectorAll<HTMLElement>(".quran-toolbar").forEach(updateToolbar)
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

document.addEventListener("nav", () => {
  // SPA navigation can reuse verse elements while restoring their server-side
  // attributes (including hidden). Reapply the view after every completed nav.
  initialized = new WeakSet<Element>()
  initialize()
})
// Popovers and block transclusions may be inserted after the page has loaded.
const observer = new MutationObserver((records) => {
  if (records.some((record) => Array.from(record.addedNodes).some(
    (node) => node instanceof Element && (node.matches(".quran-verse, .quran-toolbar") || node.querySelector(".quran-verse, .quran-toolbar")),
  ))) initialize()
})
observer.observe(document.documentElement, { childList: true, subtree: true })
initialize()

export {}
