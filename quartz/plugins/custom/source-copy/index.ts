import type { Element, Root } from "hast"
import type { VFile } from "vfile"
import { visit } from "unist-util-visit"
import type { QuartzTransformerPlugin } from "../../types"
import { simplifySlug } from "../../../util/path"
import { sourceUrl } from "./format"
// @ts-ignore -- Quartz inline script loader
import script from "./copy.inline"

export const SourceCopy: QuartzTransformerPlugin = () => ({
  name: "SourceCopy",
  htmlPlugins(ctx) {
    return [() => (tree: Root, file: VFile) => {
      const fm = file.data.frontmatter ?? {}
      const url = sourceUrl(ctx.cfg.configuration.baseUrl ?? "localhost", simplifySlug(file.data.slug!))
      visit(tree, "element", (node, _index, parent) => {
        if (parent === tree || node.properties.id) {
          node.properties.dataCopyUrl = url
          node.properties.dataCopyTitle = String(fm.isim ?? fm.title ?? "")
        }
        if (node.properties.id) node.properties.dataCopyId = String(node.properties.id)
        const classes = node.properties.className
        if (Array.isArray(classes) && classes.includes("quran-verse")) {
          const heading = node.children.find((child) => child.type === "element" &&
            Array.isArray(child.properties.className) && child.properties.className.includes("quran-verse-heading"))
          if (!heading || heading.type !== "element") return
          const toggleIndex = heading.children.findIndex((child) => child.type === "element" &&
            Array.isArray(child.properties.className) && child.properties.className.includes("quran-toggle"))
          if (toggleIndex < 0) return
          const copyButton: Element = { type: "element", tagName: "button", properties: {
            type: "button", className: ["ayet-copy"], ariaLabel: "Ayeti kaynaklı kopyala", title: "Ayeti kaynaklı kopyala",
          }, children: [{ type: "text", value: "⧉" }] }
          heading.children.splice(toggleIndex, 1, {
            type: "element", tagName: "div", properties: { className: ["quran-verse-actions"] },
            children: [heading.children[toggleIndex], copyButton],
          })
        }
      })
    }]
  },
  externalResources: () => ({ js: [{ script, contentType: "inline", loadTime: "afterDOMReady", moduleType: "module", spaPreserve: true }] }),
})
