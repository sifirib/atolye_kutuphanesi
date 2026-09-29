import assert from "node:assert/strict"
import { test } from "node:test"
import { buildExplorerModel } from "./model"
import { createSearchIndex, normalizeQuery, searchExplorer } from "./search"

const index = createSearchIndex(buildExplorerModel({
  "Hadisler/Buhari/Iman": { title: "Îman", filePath: "Hadisler/Buhari/Iman.md" },
  "Hadisler/Muslim/Iman": { title: "İman", filePath: "Hadisler/Müslim/Iman.md" },
  "Kur'an-ı-Kerim/Âl-i-İmrân": { title: "Âl-i İmrân", filePath: "Kur'an-ı Kerim/Âl-i İmrân.md" },
  "Arsiv/Eski-dosya": { title: "Başka başlık", filePath: "Arşiv/Eski dosya.md" },
}))

test("Turkish keyboard variants and punctuation match without changing labels", () => {
  assert.equal(normalizeQuery("İMAN Îman ıman"), "iman iman iman")
  const matches = searchExplorer(index, "KURAN al i imran")
  assert.equal(matches.length, 1)
  assert.equal(matches[0].node.name, "Âl-i İmrân")
  assert.equal(matches[0].path, "Kur'an-ı Kerim")
})

test("query words can match both the filename and its parent path", () => {
  const matches = searchExplorer(index, "buhari iman")
  assert.deepEqual(matches.map((entry) => entry.node.id), ["Hadisler/Buhari/Iman"])
})

test("same named files keep distinct paths and folders are searchable", () => {
  const matches = searchExplorer(index, "iman")
  assert.equal(matches.length, 2)
  assert.notEqual(matches[0].path, matches[1].path)
  const folder = searchExplorer(index, "buhari")[0]
  assert.equal(folder.node.folder, true)
  assert.equal(folder.node.id, "Hadisler/Buhari")
})

test("filenames remain searchable when frontmatter uses another title", () => {
  assert.equal(searchExplorer(index, "eski dosya")[0].node.name, "Başka başlık")
})

test("empty, punctuation-only and unmatched queries return no results", () => {
  for (const query of ["", "   ", "---", "bulunmayan başlık"]) {
    assert.deepEqual(searchExplorer(index, query), [])
  }
})

test("all matches remain available beyond the first displayed page", () => {
  const many = createSearchIndex(buildExplorerModel(Object.fromEntries(
    Array.from({ length: 85 }, (_, i) => [`Not-${i}`, { title: `Not ${i}` }]),
  )))
  assert.equal(searchExplorer(many, "Not").length, 85)
})

test("folder search includes descendants but excludes siblings and similar prefixes", () => {
  const scoped = createSearchIndex(buildExplorerModel({
    "Hadisler/Buhari/Iman": { title: "İman" },
    "Hadisler/Buhari/Alt/Iman": { title: "İman" },
    "Hadisler/Buhari-ek/Iman": { title: "İman" },
    "Hadisler/Muslim/Iman": { title: "İman" },
  }))
  assert.deepEqual(
    searchExplorer(scoped, "iman", "Hadisler/Buhari").map((entry) => entry.node.id).sort(),
    ["Hadisler/Buhari/Alt/Iman", "Hadisler/Buhari/Iman"],
  )
  assert.equal(searchExplorer(scoped, "buhari", "Hadisler/Buhari")
    .some((entry) => entry.node.id === "Hadisler/Buhari"), false)
  assert.equal(searchExplorer(scoped, "iman").length, 4)
})
