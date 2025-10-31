const svgCopy =
  '<svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true"><path fill-rule="evenodd" d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"></path><path fill-rule="evenodd" d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"></path></svg>'
const svgCheck =
  '<svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true"><path fill-rule="evenodd" fill="rgb(63, 185, 80)" d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"></path></svg>'

document.addEventListener("nav", () => {
  const els = document.getElementsByTagName("pre")
  for (let i = 0; i < els.length; i++) {
    const codeBlock = els[i].getElementsByTagName("code")[0]
    if (codeBlock) {
      const source = (
        codeBlock.dataset.clipboard ? JSON.parse(codeBlock.dataset.clipboard) : codeBlock.innerText
      ).replace(/\n\n/g, "\n")
      const button = document.createElement("button")
      button.className = "clipboard-button"
      button.type = "button"
      button.innerHTML = svgCopy
      button.ariaLabel = "Copy source"
      function onClick() {
        navigator.clipboard.writeText(source).then(
          () => {
            button.blur()
            button.innerHTML = svgCheck
            setTimeout(() => {
              button.innerHTML = svgCopy
              button.style.borderColor = ""
            }, 2000)
          },
          (error) => console.error(error),
        )
      }
      button.addEventListener("click", onClick)
      window.addCleanup(() => button.removeEventListener("click", onClick))
      els[i].prepend(button)
    }
  }
})

/**
 * Converts HTML to plain text, preserving bold/strong as **text**
 * and italic/em as *text*.
 * Replaces non-breaking spaces (U+00A0) with normal spaces.
 */
function convertHtmlToBoldMarkdown(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")

  function cleanText(text: string): string {
    // Replace non-breaking space (U+00A0) with a regular space
    return text.replace(/\u00A0/g, " ")
  }

  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return cleanText(node.textContent || "")
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      const tag = el.tagName.toLowerCase()

      if (tag === "b" || tag === "strong") {
        return `**${Array.from(el.childNodes).map(walk).join("")}**`
      }
      if (tag === "i" || tag === "em") {
        return `__${Array.from(el.childNodes).map(walk).join("")}__`
      }

      return Array.from(el.childNodes).map(walk).join("")
    }
    return ""
  }

  return walk(doc.body)
}


/**
 * Returns a URL text fragment for the first 20 characters of the selection and highlights it.
 */
function generateTextFragment(selectedText: string): string {
  const normalized = selectedText.replace(/\s+/g, " ").trim()
  const fragmentText = normalized.slice(0, 20)
  return fragmentText ? `#:~:text=${encodeURIComponent(fragmentText)}` : ""
}

function shortenLink(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^http?:\/\//, "")
    .replace(/^www\./, "")
}
// Metin seçildiğinde floating button göster
document.addEventListener("mouseup", (event) => {
  // Mobil cihazlarda buton gösterme
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth <= 768) return
    
  // 👉 Eğer tıklanan şey mevcut butonsa, yeni buton oluşturma
  if ((event.target as HTMLElement)?.id === "markdown-copy-btn") return

  const selection = window.getSelection()
  if (!selection || selection.toString().trim().length === 0) return

  // Eski buton varsa kaldır
  const existing = document.getElementById("markdown-copy-btn")
  if (existing) existing.remove()

  // Yeni buton oluştur
  const btn = document.createElement("button")
  btn.id = "markdown-copy-btn"
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" aria-label="Telegram" role="img"
      viewBox="0 0 512 512" width="18" height="18"
      style="vertical-align: middle; margin-right: 6px; border-radius: 6px;">
      <rect width="512" height="512" rx="15%" fill="#37aee2"/>
      <path fill="#c8daea" d="M199 404c-11 0-10-4-13-14l-32-105 245-144"/>
      <path fill="#a9c9dd" d="M199 404c7 0 11-4 16-8l45-43-56-34"/>
      <path fill="#f6fbfe"
        d="M204 319l135 99c14 9 26 4 30-14l55-258c5-22-9-32-24-25L79 245
        c-21 8-21 21-4 26l83 26 190-121c9-5 17-3 11 4"/>
    </svg>'a kopyala
  `

  btn.style.cssText = `
    position: absolute;
    left: ${event.pageX}px;
    top: ${event.pageY - 45}px;
    padding: 6px 12px;
    background: #2d2d2d;
    color: white;
    border: 1px solid #444;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    transition: all 0.2s;
    button svg {
      vertical-align: middle;
      transform: translateY(-1px);
    }
  `
  

  btn.addEventListener("mouseenter", () => {
    btn.style.background = "#3d3d3d"
    btn.style.transform = "scale(1.05)"
  })
  btn.addEventListener("mouseleave", () => {
    btn.style.background = "#2d2d2d"
    btn.style.transform = "scale(1)"
  })

  btn.addEventListener("click", () => {
    console.log("Markdown kopyalama başladı")
    copyAsMarkdown()

    btn.innerHTML = "✓ Kopyalandı"
    btn.style.background = "#22c55e"
    btn.style.transform = "scale(1)"
    btn.style.pointerEvents = "none"

    setTimeout(() => btn.remove(), 1000)
  })

  document.body.appendChild(btn)
})

// Başka yere tıklanınca butonu kaldır
document.addEventListener("mousedown", (event) => {
  const btn = document.getElementById("markdown-copy-btn")
  if (btn && event.target !== btn) {
    btn.remove()
  }
})

// Markdown olarak kopyalama fonksiyonu
function copyAsMarkdown() {
  const selection = window.getSelection()
  if (selection && selection.rangeCount > 0) {
    const selectedText = selection.toString()
    const fragment = generateTextFragment(selectedText)
    const sourceLink = `${window.location.href.split("#")[0]}${fragment}`

    const range = selection.getRangeAt(0)
    const div = document.createElement("div")
    div.appendChild(range.cloneContents())
    const html = div.innerHTML
    const formatted = convertHtmlToBoldMarkdown(html)
    const markdownResult = `${formatted}\n( ${shortenLink(sourceLink)} )`

    navigator.clipboard.writeText(markdownResult)
  }
}

// Normal copy event'i (sadece Ctrl+C için)
document.addEventListener("copy", (event) => {
  const selection = window.getSelection()
  if (selection && selection.rangeCount > 0) {
    const selectedText = selection.toString()

    const range = selection.getRangeAt(0)
    const div = document.createElement("div")
    div.appendChild(range.cloneContents())
    const html = div.innerHTML

    event.preventDefault()

    // Normal kopyalama: HTML ve düz metin
    event.clipboardData?.setData("text/html", html)
    event.clipboardData?.setData("text/plain", selectedText)
  }
})