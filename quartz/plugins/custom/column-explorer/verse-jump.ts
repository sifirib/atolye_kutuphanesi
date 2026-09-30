import { resolveBasePath } from "@quartz-community/utils/path"
import { loadQuranCatalog } from "../quran/catalog-client"

// One movable form per Explorer; no listeners or requests per surah row.
export function setupVerseJump(host: HTMLElement, panel: HTMLElement, beforeOpen: () => void) {
  const events = new AbortController()
  const { signal } = events
  const form = document.createElement("form")
  form.className = "cx-verse-jump"
  const input = document.createElement("input")
  input.type = "text"
  input.inputMode = "numeric"
  input.pattern = "[0-9]+"
  input.maxLength = 3
  input.required = true
  input.autocomplete = "off"
  input.placeholder = "123"
  const go = document.createElement("button")
  go.type = "submit"
  const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  arrow.setAttribute("viewBox", "0 0 24 24")
  arrow.setAttribute("aria-hidden", "true")
  const path = document.createElementNS(arrow.namespaceURI, "path")
  path.setAttribute("d", "M5 12h14m-5-5 5 5-5 5")
  arrow.append(path)
  go.append(arrow)
  const status = document.createElement("span")
  status.className = "cx-verse-status"
  status.setAttribute("role", "status")
  form.append(input, go, status)
  let opener: HTMLButtonElement | undefined
  let generation = 0

  function close(restoreFocus = false) {
    generation++
    const previous = opener
    previous?.setAttribute("aria-expanded", "false")
    if (previous) previous.hidden = false
    opener = undefined
    form.remove()
    input.value = ""
    input.setCustomValidity("")
    status.textContent = ""
    go.disabled = false
    if (restoreFocus && previous?.isConnected) previous.focus({ preventScroll: true })
  }

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return
    const button = event.target.closest<HTMLButtonElement>("button[data-cx-verse]")
    if (!button || (!host.contains(button) && !panel.contains(button))) return
    close()
    beforeOpen()
    opener = button
    button.setAttribute("aria-expanded", "true")
    button.hidden = true
    const label = `${button.dataset.cxVerseName}: ayete git`
    form.setAttribute("aria-label", label)
    input.setAttribute("aria-label", `${button.dataset.cxVerseName}: ayet numarası`)
    go.setAttribute("aria-label", label)
    go.title = label
    button.before(form)
    input.focus()
  }, { signal })
  document.addEventListener("pointerdown", (event) => {
    if (opener && event.target instanceof Node && !form.contains(event.target) && !opener.contains(event.target)) close()
  }, { signal })
  form.addEventListener("keydown", (event) => {
    // Input caret keys must not trigger the column's row navigation.
    event.stopPropagation()
    if (event.key === "Escape" && !event.isComposing) {
      event.preventDefault()
      close(true)
    }
  }, { signal })
  form.addEventListener("focusout", (event) => {
    // Keep Enter/click submission alive when disabling its button temporarily
    // clears focus, but close when Tab moves to another control.
    if (event.relatedTarget instanceof Node && !form.contains(event.relatedTarget)) close()
  }, { signal })
  input.addEventListener("input", () => {
    generation++
    input.setCustomValidity("")
    go.disabled = false
    status.textContent = ""
  }, { signal })
  form.addEventListener("submit", async (event) => {
    event.preventDefault()
    if (!opener || go.disabled) return
    const current = ++generation
    const slug = opener.dataset.cxVerse!
    const number = Number(input.value)
    go.disabled = true
    status.textContent = "Kontrol ediliyor…"
    try {
      const catalog = await loadQuranCatalog()
      if (current !== generation || !form.isConnected) return
      status.textContent = ""
      if (!catalog.find((entry) => entry.slug === slug)?.verses.includes(number)) {
        input.setCustomValidity("Bu surede bu numarada bir ayet yok.")
        input.reportValidity()
        return
      }
      const url = new URL(resolveBasePath(slug), location.href)
      url.hash = String(number)
      close()
      if (window.spaNavigate) void window.spaNavigate(url)
      else window.location.assign(url)
    } catch {
      if (current === generation && form.isConnected) {
        const message = "Liste yüklenemedi. Ok düğmesiyle tekrar dene."
        status.textContent = message
        input.setCustomValidity(message)
        input.reportValidity()
        // A network error must not block a retry with the same verse number.
        input.setCustomValidity("")
      }
    } finally {
      if (current === generation) go.disabled = false
    }
  }, { signal })
  return { close, dispose() { close(); events.abort() } }
}
