import type { Element, Root } from "hast"
import type { Root as MarkdownRoot } from "mdast"
import type { VFile } from "vfile"
import { SKIP, visit } from "unist-util-visit"
import type { QuartzTransformerPlugin } from "../../types"
import { isBuhariSource } from "./catalog-data"

// Markdown only keeps the first number of an ordered list. Preserve each
// explicit source marker in the rendered list, including gaps and repeats.
export function preserveHadisNumbers(tree: MarkdownRoot, source: string, relativePath: unknown) {
  if (!isBuhariSource(relativePath)) return
  const lines = source.split(/\r?\n/)
  for (const list of tree.children) {
    if (list.type !== "list" || !list.ordered) continue
    for (const item of list.children) {
      const line = item.position?.start.line
      if (!line) continue
      const marker = /^[ \t]*([1-9]\d*)\)(?:\s|$)/.exec(lines[line - 1] ?? "")
      if (!marker || !Number.isSafeInteger(Number(marker[1]))) continue
      item.data ??= {}
      item.data.hProperties = { ...item.data.hProperties, value: marker[1] }
    }
  }
}

// OFM can attach a record's ID to its final paragraph. Keep that same ID at
// the start of the existing list item, without adding wrappers or card styles.
export function promoteBuhariAnchors(
  tree: Root,
  relativePath: unknown,
  blocks?: Record<string, Element>,
) {
  if (!isBuhariSource(relativePath)) return
  for (const list of tree.children) {
    if (list.type !== "element" || list.tagName !== "ol") continue
    for (const item of list.children) {
      if (item.type !== "element" || item.tagName !== "li") continue
      const anchors: Element[] = []
      visit(item, "element", (node) => {
        const classes: unknown = node.properties.className
        if (
          (Array.isArray(classes) && classes.includes("transclude")) ||
          (typeof classes === "string" && classes.split(/\s+/).includes("transclude"))
        )
          return SKIP
        if (/^buhari-[1-9]\d*$/.test(String(node.properties.id ?? ""))) anchors.push(node)
      })
      if (anchors.length !== 1 || anchors[0] === item || item.properties.id) continue
      const anchor = anchors[0]
      const id = String(anchor.properties.id)
      if (blocks?.[id] && blocks[id] !== anchor) continue
      delete anchor.properties.id
      item.properties.id = id
      if (blocks) blocks[id] = item
    }
  }
}

export const BuhariAnchors: QuartzTransformerPlugin = () => ({
  name: "BuhariAnchors",
  markdownPlugins: () => [
    () => (tree: MarkdownRoot, file: VFile) => {
      preserveHadisNumbers(tree, String(file.value), file.data.relativePath)
    },
  ],
  htmlPlugins: () => [
    () => (tree: Root, file: VFile) => {
      promoteBuhariAnchors(tree, file.data.relativePath, file.data.blocks)
    },
  ],
})
