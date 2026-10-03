import { normalizeRelativeURLs } from "../../../util/path"

// Cache only a few completed pages, never preload the library.
const cache = new Map<string, { html: string; url: string; type: string }>()
export async function loadPreview(url: URL, prefix: string, signal: AbortSignal) {
  const page = new URL(url)
  page.hash = ""
  let saved = cache.get(page.href)
  if (!saved) {
    let response = await fetch(page, { signal })
    if (!response.ok) throw new Error("Preview request failed")
    let type = response.headers.get("content-type") ?? ""
    let html = type.includes("text/html") ? await response.text() : ""
    if (html) {
      const canonical = new DOMParser()
        .parseFromString(html, "text/html")
        .querySelector<HTMLLinkElement>('link[rel="canonical"]')
      const destination = canonical
        ? new URL(canonical.getAttribute("href")!, response.url || page.href)
        : page
      // Quartz alias redirects carry a canonical link. Never fetch another site.
      if (destination.origin === page.origin && destination.href !== page.href) {
        response = await fetch(destination, { signal })
        if (!response.ok) throw new Error("Preview redirect failed")
        type = response.headers.get("content-type") ?? ""
        html = type.includes("text/html") ? await response.text() : ""
      }
    }
    if (signal.aborted) throw new DOMException("Aborted", "AbortError")
    if (new URL(response.url || page.href).origin !== page.origin)
      throw new Error("External preview redirect")
    saved = { html, url: response.url || page.href, type }
    cache.set(page.href, saved)
    if (cache.size > 6) cache.delete(cache.keys().next().value!)
  }
  const fragment = document.createDocumentFragment()
  if (saved.type.startsWith("image/")) {
    const image = document.createElement("img")
    image.src = saved.url
    image.alt = url.pathname
    fragment.append(image)
    return { fragment, title: url.pathname.split("/").pop() ?? "Görsel", target: undefined }
  }
  if (!saved.type.includes("text/html"))
    throw new Error("Bu içerik önizlenemiyor; sayfayı açabilirsiniz.")
  const html = new DOMParser().parseFromString(saved.html, "text/html")
  const destination = new URL(saved.url)
  normalizeRelativeURLs(html, destination)
  html.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((link) => {
    link.href = new URL(link.getAttribute("href")!, destination).href
  })
  let hash = ""
  try {
    hash = decodeURIComponent(url.hash.slice(1))
  } catch {
    /* malformed anchors open the page top */
  }
  const target = hash ? html.getElementById(hash) : undefined
  const title = html.querySelector("h1.article-title")?.textContent?.trim() || html.title
  html.querySelectorAll("script,iframe,object,embed").forEach((node) => node.remove())
  html.querySelectorAll<HTMLElement>("*").forEach((node) => {
    for (const attribute of Array.from(node.attributes)) {
      if (attribute.name.startsWith("on")) node.removeAttribute(attribute.name)
    }
    if (node.id) node.id = prefix + node.id
    for (const attribute of ["for", "aria-labelledby", "aria-describedby", "aria-controls"]) {
      if (node.hasAttribute(attribute))
        node.setAttribute(
          attribute,
          node
            .getAttribute(attribute)!
            .split(/\s+/)
            .map((id) => prefix + id)
            .join(" "),
        )
    }
  })
  const hints = Array.from(html.querySelectorAll<HTMLElement>(".popover-hint")).filter(
    (node) => !node.parentElement?.closest(".popover-hint"),
  )
  if (!hints.length) throw new Error("Bu sayfanın önizlemesi bulunamadı.")
  fragment.append(...hints)
  return { fragment, title, target }
}
