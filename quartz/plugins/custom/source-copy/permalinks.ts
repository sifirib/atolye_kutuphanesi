import path from "node:path"
import type { Root } from "hast"
import type { VFile } from "vfile"
import type { QuartzEmitterPluginInstance, QuartzTransformerPlugin } from "../../types"
import type { ProcessedContent } from "../../vfile"
import { slugifyFilePath, type FilePath } from "../../../util/path"

export function permalinkSlug(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return
  const name = value.trim().replace(/^\/+|\/+$/g, "")
  if (/[:?#\\]/.test(name) || name.split("/").some((part) => part === "." || part === "..")) throw new Error(`Geçersiz permalink: ${value}`)
  return slugifyFilePath((name + (name.endsWith(".html") ? "" : ".md")) as FilePath)
}
export const Permalinks: QuartzTransformerPlugin = () => ({
  name: "Permalinks",
  htmlPlugins: () => [() => (_tree: Root, file: VFile) => {
    const alias = permalinkSlug(file.data.frontmatter?.permalink)
    if (alias && alias !== file.data.slug) {
      const existing = Array.isArray(file.data.aliases) ? file.data.aliases : []
      file.data.aliases = [...new Set([...existing, alias])] as typeof file.data.aliases
    }
  }],
})

export function assertUniqueRoutes(content: ProcessedContent[]) {
  const owners = new Map<string, string>()
  const key = (route: string) => route.replace(/\/index$/, "").replace(/^\/+|\/+$/g, "").normalize("NFC").toLowerCase()
  const claim = (route: string, owner: string) => {
    const existing = owners.get(key(route))
    if (existing && existing !== owner) throw new Error(`Adres çakışması: ${route} (${existing}, ${owner})`)
    owners.set(key(route), owner)
  }
  for (const [, file] of content) claim(file.data.slug!, file.data.slug!)
  for (const [, file] of content) {
    const slug = file.data.slug!
    for (const alias of Array.isArray(file.data.aliases) ? file.data.aliases : []) {
      const route = alias.startsWith(".") ? path.posix.normalize(path.posix.join(path.posix.dirname(slug), alias)) : alias
      claim(route, slug)
    }
  }
}
export function guardAliasEmitter(emitter: QuartzEmitterPluginInstance): QuartzEmitterPluginInstance {
  if (emitter.name !== "AliasRedirects") return emitter
  return { ...emitter, emit(ctx, content, resources) {
    assertUniqueRoutes(content)
    return emitter.emit(ctx, content, resources)
  }, partialEmit: undefined }
}
