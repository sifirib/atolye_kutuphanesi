import test from "node:test"
import assert from "node:assert/strict"
import { librarySort } from "./sort"

test("folders precede naturally sorted Turkish titles", () => {
  const pages = [
    { slug: "10", frontmatter: { title: "10- Bölüm" } },
    { slug: "2", frontmatter: { title: "2- Bölüm" } },
    { slug: "z/index", frontmatter: { title: "Z klasörü" } },
    { slug: "i", frontmatter: { title: "İman" } },
    { slug: "dotless", frontmatter: { title: "Işık" } },
  ]
  assert.deepEqual(pages.sort(librarySort).map((page) => page.slug), ["z/index", "2", "10", "dotless", "i"])
})
