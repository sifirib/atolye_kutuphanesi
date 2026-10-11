import type { Element, Root } from "hast"
import { isBuhariSource } from "../buhari/catalog-data"

// Use the existing outer record and its actual ID; never infer a number from prose.
export function addHadisCopyButtons(tree: Root, relativePath: unknown) {
  if (!isBuhariSource(relativePath)) return
  for (const list of tree.children) {
    if (list.type !== "element" || list.tagName !== "ol") continue
    for (const item of list.children) {
      if (item.type !== "element" || item.tagName !== "li") continue
      const match = /^buhari-([1-9]\d*)$/.exec(String(item.properties.id ?? ""))
      if (!match || item.properties.dataCopyHadis) continue
      item.properties.dataCopyHadis = match[1]
      const button: Element = {
        type: "element",
        tagName: "button",
        properties: {
          type: "button",
          className: ["hadis-copy"],
          ariaLabel: `Buhari ${match[1]}: Telegram’a kopyala`,
          title: "Telegram’a kopyala",
        },
        children: [{ type: "text", value: "⧉" }],
      }
      const first = item.children.find((child) => child.type !== "text" || child.value.trim())
      if (first?.type === "element" && first.tagName === "p") first.children.unshift(button)
      else item.children.unshift(button)
    }
  }
}
