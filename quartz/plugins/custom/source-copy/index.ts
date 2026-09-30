import type { Root } from "hast"
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
          node.children.push({ type: "element", tagName: "button", properties: {
            type: "button", className: ["ayet-copy"], ariaLabel: "Ayeti kaynaklı kopyala", title: "Ayeti kaynaklı kopyala",
          }, children: [{ type: "text", value: "⧉" }] })
        }
      })
    }]
  },
  externalResources: () => ({ js: [{ script, contentType: "inline", loadTime: "afterDOMReady", moduleType: "module", spaPreserve: true }] }),
})
