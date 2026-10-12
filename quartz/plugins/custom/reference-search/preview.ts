import type { ReferenceResult } from "./reference"
import { matchesPreviewSource } from "./preview-source"

export interface ReferencePreview {
  refresh(): void
  clear(): void
  dispose(): void
}

export function setupReferencePreview(
  container: HTMLElement,
  getReference: () => ReferenceResult | undefined,
): ReferencePreview {
  const preview = container.querySelector<HTMLElement>(".preview-container")
  if (!preview) return { refresh() {}, clear() {}, dispose() {} }
  let version = 0
  let frame: number | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let target: HTMLElement | undefined
  let last:
    { inner: HTMLElement; reference: ReferenceResult; width: number; height: number } | undefined

  function clear() {
    version++
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = undefined
    clearTimeout(timer)
    timer = undefined
    target?.removeAttribute("data-reference-preview-target")
    target = undefined
    last = undefined
  }

  function refresh() {
    const reference = getReference()
    const inner = preview!.querySelector<HTMLElement>(":scope > .preview-inner")
    if (!reference || !inner || !preview!.clientWidth || !preview!.clientHeight) {
      clear()
      return
    }
    if (
      last?.inner === inner &&
      last.reference === reference &&
      last.width === preview!.clientWidth &&
      last.height === preview!.clientHeight
    )
      return
    clear()
    const article = inner.querySelector<HTMLElement>("article.popover-hint")
    const content = article?.querySelector<HTMLElement>(".markdown-rendered")
    const block = content?.querySelector<HTMLElement>(
      reference.kind === "hadis"
        ? `:scope > ol > li[id="${reference.hash}"]`
        : `.quran-verse[id="${reference.hash}"]`,
    )
    if (
      !block ||
      block.closest(".transclude") ||
      !matchesPreviewSource(block.dataset.copyUrl, reference.slug)
    )
      return
    if (
      reference.kind === "ayet" &&
      article?.querySelector<HTMLElement>(".quran-jump[data-quran-slug]")?.dataset.quranSlug !==
        reference.slug
    )
      return
    const current = version
    last = { inner, reference, width: preview!.clientWidth, height: preview!.clientHeight }
    // Quartz queues its text-match scroll immediately after inserting the
    // preview. This observer's RAF runs afterwards and aligns the real block.
    frame = requestAnimationFrame(async () => {
      frame = undefined
      await document.fonts?.ready
      if (
        current !== version ||
        getReference() !== reference ||
        !block.isConnected ||
        preview!.querySelector(":scope > .preview-inner") !== inner ||
        !preview!.clientWidth
      )
        return
      target = block
      block.setAttribute("data-reference-preview-target", "")
      const top =
        preview!.scrollTop +
        block.getBoundingClientRect().top -
        preview!.getBoundingClientRect().top -
        preview!.clientTop -
        16
      // scrollIntoView would also move the overlay and the background page.
      preview!.scrollTop = Math.max(0, top)
      timer = setTimeout(() => {
        if (current === version) {
          block.removeAttribute("data-reference-preview-target")
          timer = undefined
        }
      }, 3000)
    })
  }

  const previewObserver = new MutationObserver(refresh)
  previewObserver.observe(preview, { childList: true })
  const overlayObserver = new MutationObserver(refresh)
  overlayObserver.observe(container, { attributes: true, attributeFilter: ["class"] })
  window.addEventListener("resize", refresh)
  return {
    refresh,
    clear,
    dispose() {
      clear()
      previewObserver.disconnect()
      overlayObserver.disconnect()
      window.removeEventListener("resize", refresh)
    },
  }
}
