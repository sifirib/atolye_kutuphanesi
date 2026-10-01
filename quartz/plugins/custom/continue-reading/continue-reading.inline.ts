const setupContinueReading = () => {
  const container = document.querySelector<HTMLElement>(".continue-reading")
  const positionButton = container?.querySelector<HTMLButtonElement>('[data-continue="position"]')
  const slug = document.body.dataset.slug
  if (!container || !positionButton || !slug) return

  const storageKey = `continue-reading:${slug}`
  let savedPosition = 0
  try {
    savedPosition = Number(localStorage.getItem(storageKey) ?? 0)
  } catch {
    savedPosition = 0
  }

  const maxScroll = document.documentElement.scrollHeight - window.innerHeight
  if (maxScroll > 240) {
    container.hidden = false
  }
  if (savedPosition > 240 && savedPosition < maxScroll - 240) {
    positionButton.hidden = false
  }

  const savePosition = () => {
    try {
      localStorage.setItem(storageKey, String(Math.round(window.scrollY)))
    } catch {}
  }

  window.addEventListener("scroll", savePosition, { passive: true })
  window.addCleanup(() => window.removeEventListener("scroll", savePosition))

  const handleClick = (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const button = target.closest<HTMLButtonElement>("button[data-continue]")
    if (!button) return

    const action = button.dataset.continue
    if (action === "top") window.scrollTo({ top: 0, behavior: "smooth" })
    if (action === "position") window.scrollTo({ top: savedPosition, behavior: "smooth" })
    if (action === "bottom") window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" })
    button.blur()
  }

  container.addEventListener("click", handleClick)
  window.addCleanup(() => container.removeEventListener("click", handleClick))
}

document.addEventListener("nav", setupContinueReading)
