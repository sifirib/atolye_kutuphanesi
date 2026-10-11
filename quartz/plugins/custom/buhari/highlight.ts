import type { QuartzTransformerPlugin } from "../../types"
// @ts-ignore -- Quartz bundles inline scripts as source text.
import script from "./highlight.inline"

export const BuhariHighlight: QuartzTransformerPlugin = () => ({
  name: "BuhariHighlight",
  externalResources: () => ({
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
