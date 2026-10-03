const desktop = matchMedia("(hover: hover) and (pointer: fine)")
const root = document.documentElement
const key = "library:left-sidebar"

function sync() {
  const sidebar = document.querySelector<HTMLElement>("#quartz-body > .sidebar.left")
  const button = document.querySelector<HTMLButtonElement>(".library-sidebar-toggle")
  if (!button) return
  const available = !!sidebar?.childElementCount && desktop.matches
  button.hidden = !available
  if (!sidebar) return
  if (!sidebar.id) sidebar.id = "library-left-sidebar"
  button.setAttribute("aria-controls", sidebar.id)
  const closed = available && root.dataset.leftSidebar === "closed"
  const restoreFocus =
    document.activeElement === button || (closed && sidebar.contains(document.activeElement))
  const settings = sidebar.querySelector<HTMLElement>(".reading-settings-open")
  const inline = !!settings
  button.dataset.inline = String(inline)
  // Keep the actual toolbar controls in place in both full and compact layouts.
  if (inline && settings.nextElementSibling !== button) settings.after(button)
  else if (!inline && button.parentElement !== document.body) document.body.append(button)
  sidebar.inert = false
  button.setAttribute("aria-expanded", String(!closed))
  button.title = closed ? "Sol paneli aç" : "Sol paneli kapat"
  button.setAttribute("aria-label", button.title)
  if (restoreFocus && available) button.focus({ preventScroll: true })
  document.dispatchEvent(new CustomEvent("library-sidebar-change", { detail: {} }))
}

function setClosed(closed: boolean) {
  root.dataset.leftSidebar = closed ? "closed" : "open"
  try {
    localStorage.setItem(key, root.dataset.leftSidebar)
  } catch {
    /* Session still works without storage. */
  }
  sync()
}

document.addEventListener("click", (event) => {
  if (
    !(event.target instanceof Element) ||
    !event.target.closest(".library-sidebar-toggle") ||
    !desktop.matches
  )
    return
  setClosed(root.dataset.leftSidebar !== "closed")
})
window.addEventListener("storage", (event) => {
  if (event.key !== key && event.key !== null) return
  root.dataset.leftSidebar = event.newValue === "closed" ? "closed" : "open"
  sync()
})
desktop.addEventListener("change", sync)
document.addEventListener("nav", sync)
sync()
export {}
