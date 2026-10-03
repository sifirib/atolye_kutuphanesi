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
  if (!Number.isFinite(savedPosition) || savedPosition < 0) savedPosition = 0

  const maxScroll = document.documentElement.scrollHeight - window.innerHeight
  if (maxScroll > 240) {
    container.hidden = false
  }
  if (savedPosition > 240 && savedPosition < maxScroll - 240) {
    positionButton.hidden = false
  }

  let pendingPosition: number | undefined
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  const flushPosition = () => {
    clearTimeout(saveTimer)
    if (pendingPosition === undefined) return
    try {
      localStorage.setItem(storageKey, String(pendingPosition))
    } catch {}
    pendingPosition = undefined
  }
  const savePosition = () => {
    pendingPosition = Math.max(0, Math.round(window.scrollY))
    clearTimeout(saveTimer)
    saveTimer = setTimeout(flushPosition, 250)
  }
  const flushWhenHidden = () => {
    if (document.hidden) flushPosition()
  }
  const events = new AbortController()
  window.addEventListener("scroll", savePosition, { passive: true })
  window.addEventListener("pagehide", flushPosition, { signal: events.signal })
  document.addEventListener("visibilitychange", flushWhenHidden, { signal: events.signal })
  window.addCleanup(() => {
    flushPosition()
    events.abort()
    window.removeEventListener("scroll", savePosition)
  })

  const handleClick = (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const button = target.closest<HTMLButtonElement>("button[data-continue]")
    if (!button) return

    const action = button.dataset.continue
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth"
    if (action === "top") window.scrollTo({ top: 0, behavior })
    if (action === "position") window.scrollTo({ top: savedPosition, behavior })
    if (action === "bottom")
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior })
  }

  container.addEventListener("click", handleClick)
  window.addCleanup(() => container.removeEventListener("click", handleClick))
}

document.addEventListener("nav", setupContinueReading)
