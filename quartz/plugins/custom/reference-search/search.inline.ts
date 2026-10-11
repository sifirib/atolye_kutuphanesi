import { loadBuhariCatalog } from "../buhari/catalog-client"
import { loadQuranCatalog } from "../quran/catalog-client"
import { navigateToBlock } from "../navigate-to-block"
import { resolveSiteUrl } from "../site-url"
import { findReference, parseReference, type ReferenceResult } from "./reference"

interface SearchState {
  input: HTMLInputElement
  container: HTMLElement
  results: HTMLElement
  query: string
  generation: number
  pending: boolean
  enter: boolean
  card?: HTMLAnchorElement
  observer: MutationObserver
}

const states = new Map<HTMLInputElement, SearchState>()
const isCurrent = (state: SearchState) =>
  states.get(state.input) === state &&
  state.input.isConnected &&
  state.input.value === state.query &&
  state.container.classList.contains("active")

function clear(state: SearchState) {
  state.generation++
  state.observer.disconnect()
  state.card?.remove()
  state.card = undefined
  state.pending = state.enter = false
}

function placeCard(state: SearchState) {
  const card = state.card
  if (!card || !isCurrent(state) || state.results.firstElementChild === card) return
  state.results.querySelector(".no-match")?.remove()
  state.results.prepend(card)
  // Observe Quartz replacing results, never our own insertion or focus styles.
  state.observer.takeRecords()
  card.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }))
}

function makeCard(state: SearchState, result: ReferenceResult): HTMLAnchorElement {
  const card = document.createElement("a")
  const url = resolveSiteUrl(result.slug)
  url.hash = result.hash
  card.href = url.href
  // Search's native preview reads the row ID as a source URL. The fragment
  // also keeps this ID distinct from the ordinary result for the same page.
  card.id = `${result.slug}#${result.hash}`
  card.className = "result-card reference-search-result"
  const title = document.createElement("h3")
  title.className = "card-title"
  title.textContent = result.title
  const description = document.createElement("p")
  description.className = "card-description"
  description.textContent = result.kind === "hadis" ? "Hadise git" : "Ayete git"
  card.append(title, description)
  // Keep this listener on the row: native Enter can click it after removing
  // it from the results. Modified clicks retain normal new-tab behavior.
  card.addEventListener(
    "click",
    (event) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
        return
      event.preventDefault()
      event.stopImmediatePropagation()
      // Native Search may briefly keep a detached selection from an older
      // query. It must never activate a reference we have already cleared.
      if (states.get(state.input) !== state || state.card !== card) return
      try {
        sessionStorage.removeItem("search-term")
      } catch {
        /* Storage may be blocked. */
      }
      state.container.dispatchEvent(new MouseEvent("click", { bubbles: true }))
      void navigateToBlock(url).catch(() => window.location.assign(url))
    },
    { capture: true },
  )
  return card
}

async function update(input: HTMLInputElement) {
  let state = states.get(input)
  if (state) clear(state)
  const reference = parseReference(input.value)
  if (!reference) return
  if (!state) {
    const search = input.closest(".search")
    const container = search?.querySelector<HTMLElement>(".search-container")
    const results = search?.querySelector<HTMLElement>(".results-container")
    if (!container || !results) return
    state = {
      input,
      container,
      results,
      query: "",
      generation: 0,
      pending: false,
      enter: false,
      observer: new MutationObserver(() => placeCard(state!)),
    }
    states.set(input, state)
  }
  state.query = input.value
  state.pending = true
  const generation = ++state.generation
  state.observer.observe(state.results, { childList: true })
  try {
    const result =
      reference.kind === "hadis"
        ? findReference(reference, await loadBuhariCatalog())
        : findReference(reference, [], await loadQuranCatalog())
    if (generation !== state.generation || !isCurrent(state)) return
    if (result) {
      state.card = makeCard(state, result)
      placeCard(state)
    }
  } catch {
    // A failed catalog must leave ordinary full-text search usable.
  } finally {
    if (generation === state.generation && isCurrent(state)) {
      state.pending = false
      if (!state.card) state.observer.disconnect()
      if (state.enter) {
        state.enter = false
        input.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
        )
      }
    }
  }
}

document.addEventListener(
  "input",
  (event) => {
    if (event.target instanceof HTMLInputElement && event.target.matches(".search .search-bar")) {
      void update(event.target)
    }
  },
  { capture: true },
)

document.addEventListener(
  "keydown",
  (event) => {
    if (event.key !== "Enter" || event.isComposing || !(event.target instanceof HTMLInputElement))
      return
    const state = states.get(event.target)
    if (!state || !isCurrent(state)) return
    if (state.pending || state.card?.classList.contains("focus")) {
      event.preventDefault()
      event.stopImmediatePropagation()
      if (state.pending) state.enter = true
      else state.card?.click()
    }
  },
  { capture: true },
)

function dispose() {
  for (const state of states.values()) clear(state)
  states.clear()
}
document.addEventListener("nav", dispose)
document.addEventListener("render", dispose)
