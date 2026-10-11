import type { QuartzTransformerPlugin } from "../../types"
// @ts-ignore -- Quartz bundles inline scripts as source text.
import script from "./search.inline"

export const ReferenceSearch: QuartzTransformerPlugin = () => ({
  name: "ReferenceSearch",
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
