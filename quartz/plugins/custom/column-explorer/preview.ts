import { computePosition, flip, offset, shift } from "@floating-ui/dom"
import { fetchCanonical } from "../../../components/scripts/util"
import { normalizeRelativeURLs } from "../../../util/path"

// One delegated controller and one preview per mounted Explorer. Use Quartz's
// content and styling, without re-running global nav/render handlers.
export function setupPreview(host: HTMLElement, panel: HTMLElement, enabled: () => boolean) {
  const events = new AbortController()
  const { signal } = events
  const popup = document.createElement("div")
  popup.className = "popover cx-preview"
  popup.hidden = true
  popup.setAttribute("role", "region")
  popup.setAttribute("aria-label", "Dosya önizlemesi")
  const inner = document.createElement("div")
  inner.className = "popover-inner"
  inner.tabIndex = 0
  popup.append(inner)
  document.body.append(popup)
  let anchor: HTMLAnchorElement | null = null
  let openTimer = 0
  let closeTimer = 0
  let generation = 0
  let cachedURL = ""

  function close() {
    generation++
    window.clearTimeout(openTimer)
    window.clearTimeout(closeTimer)
    popup.hidden = true
    anchor = null
  }

  function fileLink(target: EventTarget | null) {
    if (!(target instanceof Element)) return null
    const link = target.closest<HTMLAnchorElement>("a.cx-row[href]")
    return link && (host.contains(link) || panel.contains(link)) ? link : null
  }

  async function show(link: HTMLAnchorElement, keyboard: boolean) {
    if (!enabled() || !link.isConnected || !link.getClientRects().length) return
    close()
    anchor = link
    const current = generation
    const url = new URL(link.href)
    if (url.origin !== location.origin) return
    url.hash = ""
    const valid = () => current === generation && enabled() && link.isConnected
      && link.getClientRects().length > 0
    try {
      if (cachedURL !== url.href) {
        const response = await fetchCanonical(url)
        if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) return
        const html = new DOMParser().parseFromString(await response.text(), "text/html")
        if (!valid()) return
        const destination = new URL(response.url || url.href)
        normalizeRelativeURLs(html, destination)
        html.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
          a.href = new URL(a.getAttribute("href")!, destination).href
        })
        // Namespace IDs and local accessibility references in the copied DOM.
        html.querySelectorAll<HTMLElement>("[id]").forEach((el) => { el.id = `cx-preview-${el.id}` })
        for (const attribute of ["for", "aria-labelledby", "aria-describedby", "aria-controls"]) {
          html.querySelectorAll(`[${attribute}]`).forEach((el) => {
            el.setAttribute(attribute, el.getAttribute(attribute)!.split(/\s+/)
              .map((id) => `cx-preview-${id}`).join(" "))
          })
        }
        const hints = [...html.querySelectorAll<HTMLElement>(".popover-hint")]
          .filter((el) => !el.parentElement?.closest(".popover-hint"))
        if (!hints.length) return
        html.querySelectorAll("script").forEach((el) => el.remove())
        inner.replaceChildren(...hints)
        cachedURL = url.href
      }
      if (!valid()) return
      popup.setAttribute("aria-label", `${link.querySelector(".cx-name")?.textContent ?? "Dosya"} önizlemesi`)
      popup.hidden = false
      popup.style.visibility = "hidden"
      const position = await computePosition(link, popup, {
        strategy: "fixed",
        placement: "right-start",
        middleware: [offset(8), flip(), shift({ padding: 8 })],
      })
      if (!valid()) return
      popup.style.left = `${position.x}px`
      popup.style.top = `${position.y}px`
      popup.style.visibility = "visible"
      inner.scrollTop = 0
      if (keyboard) inner.focus({ preventScroll: true })
    } catch {
      // A failed preview must not interfere with the normal file link.
      if (valid()) close()
    }
  }

  document.addEventListener("pointerover", (event) => {
    if (event.pointerType === "touch" || !enabled()) return
    if (popup.contains(event.target as Node)) {
      window.clearTimeout(closeTimer)
      return
    }
    const link = fileLink(event.target)
    if (!link || link.contains(event.relatedTarget as Node | null)) return
    if (link === anchor && !popup.hidden) { window.clearTimeout(closeTimer); return }
    close()
    anchor = link
    openTimer = window.setTimeout(() => void show(link, false), 250)
  }, { signal })

  document.addEventListener("pointerout", (event) => {
    const from = event.target as Node
    const to = event.relatedTarget as Node | null
    if (!popup.contains(from) && !anchor?.contains(from)) return
    if (popup.contains(to) || anchor?.contains(to)) return
    window.clearTimeout(openTimer)
    closeTimer = window.setTimeout(close, 180)
  }, { signal })

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && anchor) {
      const returnTo = anchor
      const restoreFocus = popup.contains(document.activeElement)
      close()
      if (restoreFocus && returnTo.isConnected) returnTo.focus({ preventScroll: true })
      event.preventDefault()
      event.stopImmediatePropagation()
    } else if (event.code === "Space" && !event.repeat && !event.ctrlKey && !event.metaKey
      && !event.altKey && !event.shiftKey && enabled()) {
      const link = fileLink(event.target)
      if (!link) return
      event.preventDefault()
      event.stopImmediatePropagation()
      void show(link, true)
    }
  }, { signal, capture: true })
  document.addEventListener("pointerdown", (event) => {
    if (!popup.contains(event.target as Node)) close()
  }, { signal })
  document.addEventListener("focusin", (event) => {
    if (anchor && !popup.contains(event.target as Node) && event.target !== anchor) close()
  }, { signal })
  window.addEventListener("resize", close, { signal })
  document.addEventListener("scroll", (event) => {
    if (!popup.contains(event.target as Node)) close()
  }, { signal, capture: true })

  return {
    close,
    dispose() {
      close()
      events.abort()
      popup.remove()
    },
  }
}
