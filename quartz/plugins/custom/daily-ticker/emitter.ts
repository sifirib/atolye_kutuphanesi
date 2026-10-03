import type { QuartzEmitterPlugin } from "../../types"
import { write } from "../../emitters/helpers"
import type { FullSlug } from "../../../util/path"
import { collectAyets, type AyetQuote } from "./data"

export const DailyTickerData: QuartzEmitterPlugin = () => ({
  name: "DailyTickerData",
  async emit(ctx, content) {
    const entries: AyetQuote[] = []
    for (const [tree, file] of content) {
      const fm = file.data.frontmatter
      if (fm?.type === "Kur'an-ı Kerim" && typeof fm.sure === "number") {
        entries.push(
          ...collectAyets(tree, file.data.slug!, String(fm.isim ?? fm.title ?? ""), fm.sure),
        )
      }
    }
    entries.sort((a, b) => a.slug.localeCompare(b.slug, "tr") || a.ayet - b.ayet)
    return [
      await write({
        ctx,
        slug: "static/daily-ayets" as FullSlug,
        ext: ".json",
        content: JSON.stringify(entries),
      }),
    ]
  },
})
