import { pathToRoot, resolveBasePath } from "@quartz-community/utils"
import type { FullSlug } from "@quartz-community/types"

// Resolve from the rendered page, so local previews and subdirectory hosting
// work without depending on the production basepath stored in the HTML.
export function resolveSiteUrl(
  target: string,
  slug = document.body.dataset.slug ?? "index",
  href = location.href,
  basePath = typeof document === "undefined" ? "" : (document.body.dataset.basepath ?? ""),
): URL {
  const base = basePath.replace(/\/$/, "")
  const page = new URL(href)
  // SPA aliases can have a different depth than their source slug. Retain the
  // configured prefix when the current URL is actually served under it.
  if (base && (page.pathname === base || page.pathname.startsWith(`${base}/`))) {
    return new URL(resolveBasePath(target, base), page)
  }
  return new URL(`${pathToRoot(slug as FullSlug)}/${target.replace(/^\/+/, "")}`, href)
}
