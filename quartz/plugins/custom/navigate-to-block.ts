// Let page preferences and fonts settle before aligning an existing block.
// Keep Quartz's first scroll instant so a pending animation cannot undo it.
export async function navigateToBlock(url: URL): Promise<void> {
  if (!window.spaNavigate) {
    window.location.assign(url)
    return
  }
  const rootStyle = document.documentElement.style
  const previousScroll = rootStyle.scrollBehavior
  rootStyle.scrollBehavior = "auto"
  try {
    await window.spaNavigate(url)
  } finally {
    rootStyle.scrollBehavior = previousScroll
  }
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  await document.fonts?.ready
  if (location.href === url.href) {
    document
      .getElementById(url.hash.slice(1))
      ?.scrollIntoView({ block: "start", behavior: "instant" })
  }
}
