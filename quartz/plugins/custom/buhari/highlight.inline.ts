let highlighted: HTMLElement | undefined
let timeout: ReturnType<typeof setTimeout> | undefined

function clearHighlight() {
  clearTimeout(timeout)
  timeout = undefined
  highlighted?.removeAttribute("data-buhari-highlight")
  highlighted = undefined
}

function highlightCurrentHadis() {
  clearHighlight()
  const id = location.hash.slice(1)
  if (!/^buhari-[1-9]\d*$/.test(id)) return
  // Only the actual record in the main article, never a copied preview.
  const target = document.querySelector<HTMLElement>(
    `.page .center > article .markdown-rendered > ol > li[id="${id}"]`,
  )
  if (!target) return
  highlighted = target
  target.setAttribute("data-buhari-highlight", "")
  timeout = setTimeout(clearHighlight, 3000)
}

// One controller for both Raflar and global Search, including repeated jumps.
document.addEventListener("library:block-navigated", highlightCurrentHadis)
document.addEventListener("prenav", clearHighlight)
document.addEventListener("nav", highlightCurrentHadis)
window.addEventListener("hashchange", highlightCurrentHadis)
highlightCurrentHadis()
