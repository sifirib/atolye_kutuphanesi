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
 * Converts HTML to plain text, preserving bold/strong as **text**.
 */
function convertHtmlToBoldMarkdown(html: string): string {
  // Create a DOM parser
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")

  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || ""
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      if (el.tagName === "B" || el.tagName === "STRONG") {
        return `**${Array.from(el.childNodes).map(walk).join("") }**`
      }
      // Ignore all other elements, but process their children
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
    .replace(/^www\./, "");
}

document.addEventListener("copy", (event) => {
  const selection = window.getSelection()
  if (selection && selection.rangeCount > 0) {
    const selectedText = selection.toString()
    const fragment = generateTextFragment(selectedText)
    const sourceLink = `${window.location.href.split("#")[0]}${fragment}`

    const range = selection.getRangeAt(0)
    const div = document.createElement("div")
    div.appendChild(range.cloneContents())
    const html = div.innerHTML
    console.log("Selected HTML:", html)
    const formatted = convertHtmlToBoldMarkdown(html)
    console.log("Formatted:", formatted)
    const result = `${formatted} ( ${shortenLink(sourceLink)} )`
    event.preventDefault()
    event.clipboardData?.setData("text/plain", result)
  }
})
