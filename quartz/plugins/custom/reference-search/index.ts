import type { QuartzTransformerPlugin } from "../../types"
import style from "./preview.scss"
// @ts-ignore -- Quartz bundles inline scripts as source text.
import script from "./search.inline"

export const ReferenceSearch: QuartzTransformerPlugin = () => ({
  name: "ReferenceSearch",
  externalResources: () => ({
    css: [{ content: style, inline: true }],
    js: [
      {
        script,
        contentType: "inline",
        loadTime: "afterDOMReady",
        moduleType: "module",
        spaPreserve: true,
      },
    ],
  }),
})
