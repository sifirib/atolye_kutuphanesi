import type { QuartzEmitterPlugin } from "../../types"
import { write } from "../../emitters/helpers"
import type { FullSlug } from "../../../util/path"
import { buildBuhariCatalog } from "./catalog-data"

export const BuhariCatalog: QuartzEmitterPlugin = () => ({
  name: "BuhariCatalog",
  async emit(ctx, content) {
    return [
      await write({
        ctx,
        slug: "static/buhari-catalog" as FullSlug,
        ext: ".json",
        content: JSON.stringify(buildBuhariCatalog(content)),
      }),
    ]
  },
})
