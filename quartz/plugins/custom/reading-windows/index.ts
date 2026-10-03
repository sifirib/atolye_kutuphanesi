import type { QuartzTransformerPlugin } from "../../types"
// @ts-ignore -- Quartz bundles inline scripts as source text.
import script from "./windows.inline"

export const ReadingWindows: QuartzTransformerPlugin = () => ({
  name: "ReadingWindows",
  externalResources(ctx) {
    if (!ctx.cfg.configuration.enablePopovers) return {}
    return {
      js: [
        {
          script,
          contentType: "inline",
          loadTime: "afterDOMReady",
          moduleType: "module",
          spaPreserve: true,
        },
      ],
    }
  },
})
