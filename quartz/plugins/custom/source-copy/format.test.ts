import test from "node:test"
import assert from "node:assert/strict"
import { plainText, sourceUrl } from "./format"
import { assertUniqueRoutes, permalinkSlug } from "./permalinks"
import { VFile } from "vfile"
import type { ProcessedContent } from "../../vfile"
import type { FullSlug } from "../../../util/path"

test("copy preserves paragraphs, line breaks, Arabic and ordered list starts", () => {
  assert.equal(plainText({ tag: "div", children: [
    { tag: "p", children: [{ text: "بسم الله" }, { tag: "br" }, { text: "Türkçe\u00a0meal" }] },
    { tag: "ol", start: 5, children: [{ text: "\n" }, { tag: "li", children: [{ tag: "strong", children: [{ text: "Beş" }] }] }, { tag: "li", children: [{ text: "Altı" }] }] },
  ] }).trim(), "بسم الله\nTürkçe meal\n\n\n5) Beş\n6) Altı")
})
test("source links preserve site subpaths and actual block IDs", () => {
  const url = new URL(sourceUrl("example.org/library", "kur'an-ı-kerim/bakara", "255"))
  assert.equal(decodeURI(url.pathname), "/library/kur'an-ı-kerim/bakara")
  assert.equal(url.hash, "#255")
})
test("permalinks reject traversal and reserve existing page routes", () => {
  assert.throws(() => permalinkSlug("../private"))
  assert.throws(() => permalinkSlug("https://example.org"))
  const file = (slug: string, aliases: string[] = []): ProcessedContent => {
    const value = new VFile(""); value.data.slug = slug as FullSlug; value.data.aliases = aliases as typeof value.data.aliases
    return [{ type: "root", children: [] }, value]
  }
  assert.throws(() => assertUniqueRoutes([file("hadisler/a", ["buhari-1"]), file("buhari-1")]))
  assert.doesNotThrow(() => assertUniqueRoutes([file("hadisler/a", ["buhari-1"])]))
})
