export type CopyNode = { tag?: string; text?: string; start?: number; children?: CopyNode[] }

export function plainText(node: CopyNode): string {
  if (node.text !== undefined) return node.text.replace(/\u00a0/g, " ")
  const children = node.children ?? []
  if (node.tag === "br") return "\n"
  if (node.tag === "ol" || node.tag === "ul") {
    return "\n" + children.filter((child) => child.tag === "li").map((child, index) =>
      `${node.tag === "ol" ? `${(node.start ?? 1) + index})` : "•"} ${plainText(child).trim()}`,
    ).join("\n") + "\n"
  }
  const content = children.map(plainText).join("")
  return /^(p|div|li|blockquote|h[1-6])$/.test(node.tag ?? "") ? content + "\n\n" : content
}

export function sourceUrl(base: string, slug: string, id?: string): string {
  const root = new URL(/^https?:\/\//.test(base) ? base : `https://${base}`)
  root.pathname = root.pathname.replace(/\/$/, "") + "/"
  const url = new URL(slug.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/"), root)
  if (id) url.hash = id
  return url.href
}
