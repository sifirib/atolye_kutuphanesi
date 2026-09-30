import { visit, SKIP } from "unist-util-visit"
import type { QuartzEmitterPlugin } from "../../types"
import { write } from "../../emitters/helpers"
import type { FullSlug } from "../../../util/path"

export interface SurahEntry {
  slug: string
  name: string
  number: number
  verses: number[]
}

// Build from published, transformed content; no hard-coded names or verse counts.
export const QuranCatalog: QuartzEmitterPlugin = () => ({
  name: "QuranCatalog",
  async emit(ctx, content) {
    const entries: SurahEntry[] = []
    for (const [tree, file] of content) {
      const fm = file.data.frontmatter
      if (fm?.type !== "Kur'an-ı Kerim" || typeof fm.sure !== "number"
        || !Number.isInteger(fm.sure) || fm.sure < 1 || fm.sure > 114) continue
      const verses: number[] = []
      visit(tree, "element", (node) => {
        const classes = node.properties.className
        if (Array.isArray(classes) && classes.includes("transclude")) return SKIP
        if (Array.isArray(classes) && classes.includes("quran-verse") && /^\d+$/.test(String(node.properties.id))) {
          verses.push(Number(node.properties.id))
        }
      })
      if (verses.length) entries.push({
        slug: file.data.slug!, name: String(fm.isim ?? fm.title ?? ""),
        number: fm.sure, verses,
      })
    }
    entries.sort((a, b) => a.number - b.number)
    return [await write({ ctx, slug: "static/quran-catalog" as FullSlug, ext: ".json", content: JSON.stringify(entries) })]
  },
})
