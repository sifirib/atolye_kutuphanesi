// The shared desktop provider owns preview loading and window lifetime.
// Explorer changes dismiss only its temporary preview, never pinned windows.
export function setupPreview(_host: HTMLElement, _panel: HTMLElement, _enabled: () => boolean) {
  const close = () =>
    document.dispatchEvent(new CustomEvent("reading-preview-close", { detail: {} }))
  return { close, dispose: close }
}
