import assert from "node:assert/strict"
import { test } from "node:test"
import { buildExplorerModel, canSearchFolder, folderPath, sortSurahs } from "./model"

test("surah order preserves the alphabetical model and keeps folders first and unnumbered files last", () => {
  const model = buildExplorerModel({
    "Quran/Abese": { title: "Abese" },
    "Quran/Bakara": { title: "Bakara" },
    "Quran/Fatiha": { title: "Fâtiha" },
    "Quran/Aciklama": { title: "Açıklama" },
    "Quran/Notlar/index": { title: "Notlar" },
  })
  const children = model.nodes.get("Quran")!.children
  const original = children.map((node) => node.id)
  assert.deepEqual(sortSurahs(children, {
    "Quran/Fatiha": 1, "Quran/Bakara": 2, "Quran/Abese": 80,
  }).map((node) => node.id), [
    "Quran/Notlar", "Quran/Fatiha", "Quran/Bakara", "Quran/Abese", "Quran/Aciklama",
  ])
  assert.deepEqual(children.map((node) => node.id), original)
})

test("search is hidden for empty and single-file folders, but kept for subfolders", () => {
  const model = buildExplorerModel({
    "Empty/index": { title: "Empty" },
    "Single/note": { title: "Note" },
    "Several/one": { title: "One" },
    "Several/two": { title: "Two" },
    "Nested/Child/note": { title: "Note" },
  })
  assert.equal(canSearchFolder(model.nodes.get("Empty")!), false)
  assert.equal(canSearchFolder(model.nodes.get("Single")!), false)
  assert.equal(canSearchFolder(model.nodes.get("Several")!), true)
  assert.equal(canSearchFolder(model.nodes.get("Nested")!), true)
})

test("folder indexes and descendants form one folder in either input order", () => {
  const entries = [
    ["Hadisler/index", { title: "Hadisler", filePath: "Hadisler/index.md" }],
    ["Hadisler/Buhari/2", { title: "2. kitap", filePath: "Hadisler/Buhari/2.md" }],
  ] as const
  for (const ordered of [entries, [...entries].reverse()]) {
    const model = buildExplorerModel(Object.fromEntries(ordered))
    assert.equal(model.root.children.length, 1)
    assert.equal(model.nodes.get("Hadisler")?.folder, true)
    assert.deepEqual(folderPath(model, "Hadisler/Buhari/2"), ["Hadisler", "Hadisler/Buhari"])
    assert.deepEqual(folderPath(model, "Hadisler/index"), ["Hadisler"])
  }
})

test("folders sort before naturally ordered file titles", () => {
  const model = buildExplorerModel({
    "10": { title: "10. kitap" },
    "2": { title: "2. kitap" },
    "Arsiv/bir": { title: "Bir" },
    "1": { title: "1. kitap" },
  })
  assert.deepEqual(model.root.children.map((node) => node.id), ["Arsiv", "1", "2", "10"])
})

test("real path labels preserve punctuation and Unicode while links use slugs", () => {
  const model = buildExplorerModel({
    "Kur'an-ı-Kerim/Âl-i-İmrân": {
      title: "Âl-i İmrân",
      filePath: "Kur'an-ı Kerim/Âl-i İmrân.md",
    },
  })
  assert.equal(model.root.children[0].name, "Kur'an-ı Kerim")
  assert.equal(model.root.children[0].children[0].id, "Kur'an-ı-Kerim/Âl-i-İmrân")
})

test("root indexes and tag pages do not become duplicate navigation entries", () => {
  const model = buildExplorerModel({
    index: { title: "Ana sayfa" },
    "tags/bir": { title: "Etiket" },
    "Bos/index": { title: "Boş klasör", filePath: "Bos/index.md" },
  })
  assert.deepEqual(model.root.children.map((node) => node.id), ["Bos"])
  assert.equal(model.nodes.get("Bos")?.children.length, 0)
  assert.deepEqual(folderPath(model, "index"), [])
  assert.deepEqual(folderPath(model, "olmayan/sayfa"), [])
})

test("equal file titles remain separate under different parents", () => {
  const model = buildExplorerModel({
    "A/Not": { title: "Not" },
    "B/Not": { title: "Not" },
  })
  assert.deepEqual(folderPath(model, "A/Not"), ["A"])
  assert.deepEqual(folderPath(model, "B/Not"), ["B"])
  assert.notEqual(model.nodes.get("A/Not"), model.nodes.get("B/Not"))
})
