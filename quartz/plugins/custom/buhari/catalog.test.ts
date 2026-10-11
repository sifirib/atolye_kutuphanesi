import assert from "node:assert/strict"
import { test } from "node:test"
import type { Element, Root } from "hast"
import type { Root as MarkdownRoot } from "mdast"
import { unified } from "unified"
import { visit } from "unist-util-visit"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { ObsidianFlavoredMarkdown } from "@quartz-community/obsidian-flavored-markdown"
import { VFile } from "vfile"
import type { BuildCtx } from "../../../util/ctx"
import type { ProcessedContent } from "../../vfile"
import { buildBuhariCatalog, isBuhariSource } from "./catalog-data"
import { BuhariAnchors, preserveHadisNumbers, promoteBuhariAnchors } from "./anchors"

function anchor(id: string): Element {
  return { type: "element", tagName: "p", properties: { id }, children: [] }
}

function page(
  slug: string,
  children: Root["children"],
  relativePath = "Hadisler/Buhari/1- Vahy.md",
): ProcessedContent {
  const file = new VFile("Değişmemesi gereken kaynak metin.")
  file.data.slug = slug as typeof file.data.slug
  file.data.relativePath = relativePath as typeof file.data.relativePath
  return [{ type: "root", children }, file]
}

test("scopes actual Buhari source books including Windows paths", () => {
  assert.equal(isBuhariSource("Hadisler\\Buhari\\54 - Kitabüş Şurüt.md"), true)
  for (const path of [
    undefined,
    "Hadisler/Buhari/index.md",
    "Hadisler/Müslim/1- İman.md",
    "Arşiv/Hadisler/Buhari/1- Vahy.md",
    "Hadisler/Buhari/alt/1- Vahy.md",
  ]) {
    assert.equal(isBuhariSource(path), false)
  }
  assert.deepEqual(
    buildBuhariCatalog([
      page("buhari/vahy", [anchor("buhari-1")]),
      page("muslim/iman", [anchor("buhari-2")], "Hadisler/Müslim/1- İman.md"),
      page("buhari", [anchor("buhari-3")], "Hadisler/Buhari/index.md"),
    ]),
    [{ slug: "buhari/vahy", numbers: [1] }],
  )
})

test("groups existing positive anchors deterministically without deriving missing IDs", () => {
  const first = page("buhari/10", [anchor("buhari-10"), anchor("buhari-9")])
  const second = page("buhari/2", [anchor("buhari-2")])
  const invalid = page("buhari/3", [
    anchor("3"),
    anchor("buhari_3"),
    anchor("buhari-0"),
    anchor("buhari-03"),
    anchor("buhari--3"),
    anchor("buhari-9007199254740992"),
    {
      type: "element",
      tagName: "p",
      properties: {},
      children: [{ type: "text", value: "4) Metin." }],
    },
  ])
  const before = JSON.stringify([first, second, invalid])
  const expected = [
    { slug: "buhari/2", numbers: [2] },
    { slug: "buhari/10", numbers: [9, 10] },
  ]
  assert.deepEqual(buildBuhariCatalog([first, second, invalid]), expected)
  assert.deepEqual(buildBuhariCatalog([invalid, second, first]), expected)
  assert.equal(JSON.stringify([first, second, invalid]), before)
})

test("excludes every repeated anchor globally and within one page", () => {
  assert.deepEqual(
    buildBuhariCatalog([
      page("buhari/a", [
        anchor("buhari-1"),
        anchor("buhari-2"),
        anchor("buhari-2"),
        anchor("buhari-3"),
      ]),
      page("buhari/b", [anchor("buhari-1"), anchor("buhari-4")]),
      page("buhari/c", [anchor("buhari-1")]),
    ]),
    [
      { slug: "buhari/a", numbers: [3] },
      { slug: "buhari/b", numbers: [4] },
    ],
  )
})

test("ignores transcluded anchors without rejecting the original destination", () => {
  const embed = (className: string | string[]): Element => ({
    type: "element",
    tagName: "blockquote",
    properties: { className: className as Element["properties"]["className"] },
    children: [anchor("buhari-1"), anchor("buhari-2")],
  })
  assert.deepEqual(
    buildBuhariCatalog([
      page("buhari/a", [anchor("buhari-1"), embed(["transclude"]), embed("transclude other")]),
    ]),
    [{ slug: "buhari/a", numbers: [1] }],
  )
})

test("uses Quartz's actual loose and tight list block anchors", async () => {
  const source =
    "1) **Metin.** ^buhari-1\n2) İkinci metin. ^buhari-2\n\n### Bâb\n\n3) İlk paragraf.\n\n    _Son paragraf._ ^buhari-3\n\n4) Kimliksiz kayıt.\n"
  const file = new VFile(source)
  file.data.slug = "hadisler/buhari/1-vahy" as typeof file.data.slug
  file.data.relativePath = "Hadisler/Buhari/1- Vahy.md" as typeof file.data.relativePath
  const obsidian = ObsidianFlavoredMarkdown({
    comments: false,
    highlight: false,
    wikilinks: false,
    callouts: false,
    mermaid: false,
    parseTags: false,
    enableCheckbox: false,
  })
  const processor = unified()
    .use(remarkParse)
    .use(BuhariAnchors().markdownPlugins!({} as BuildCtx))
    .use(remarkRehype)
    .use(obsidian.htmlPlugins!({} as BuildCtx))
  const tree = (await processor.run(processor.parse(file), file)) as Root
  assert.equal(file.data.blocks?.["buhari-1"].tagName, "li")
  assert.equal(file.data.blocks?.["buhari-3"].tagName, "p")
  const bodyBefore = JSON.stringify(tree, (key, value) => (key === "id" ? undefined : value))
  promoteBuhariAnchors(tree, file.data.relativePath, file.data.blocks)
  assert.equal(file.data.blocks?.["buhari-3"].tagName, "li")
  assert.equal(
    JSON.stringify(tree, (key, value) => (key === "id" ? undefined : value)),
    bodyBefore,
  )
  const once = JSON.stringify(tree)
  promoteBuhariAnchors(tree, file.data.relativePath, file.data.blocks)
  assert.equal(JSON.stringify(tree), once)
  assert.deepEqual(buildBuhariCatalog([[tree, file]]), [
    { slug: "hadisler/buhari/1-vahy", numbers: [1, 2, 3] },
  ])
  assert.equal(file.value, source)
})

test("renders the exact source numbers across gaps, repeats and empty records", async () => {
  const source =
    "1680) **First.** ^buhari-1680\r\n1682) _Second._ ^buhari-1682\r\n1682) Repeated record.\r\n1685)\r\n1688) Outer record.\r\n\r\n        1) Nested list.\r\n        3) Nested list again.\r\n\r\n1690. Different delimiter.\r\n"
  const file = new VFile(source)
  file.data.relativePath = "Hadisler/Buhari/25- Kitabul Hacc.md" as typeof file.data.relativePath
  const processor = unified().use(remarkParse)
  const markdown = processor.parse(file) as MarkdownRoot
  const stripData = (key: string, value: unknown) => (key === "data" ? undefined : value)
  const before = JSON.stringify(markdown, stripData)
  const first = markdown.children[0]
  assert.equal(first.type, "list")
  if (first.type !== "list") return
  first.children[0].data = { hProperties: { className: ["existing"] } }
  preserveHadisNumbers(markdown, source, file.data.relativePath)
  assert.equal(JSON.stringify(markdown, stripData), before)
  assert.deepEqual(
    first.children.map((item) => item.data?.hProperties?.value),
    ["1680", "1682", "1682", "1685", "1688"],
  )
  assert.deepEqual(first.children[0].data.hProperties?.className, ["existing"])
  const tree = (await unified().use(remarkRehype).run(markdown, file)) as Root
  const values: unknown[] = []
  visit(tree, "element", (node) => {
    if (node.tagName === "li") values.push(node.properties.value)
  })
  assert.deepEqual(values, [
    "1680",
    "1682",
    "1682",
    "1685",
    "1688",
    undefined,
    undefined,
    undefined,
  ])
  assert.equal(file.value, source)
  const once = JSON.stringify(markdown)
  preserveHadisNumbers(markdown, source, file.data.relativePath)
  assert.equal(JSON.stringify(markdown), once)
})

test("number preservation leaves other books and unpositioned items unchanged", () => {
  const source = "5) First.\n8) Second.\n"
  const tree = unified().use(remarkParse).parse(source) as MarkdownRoot
  const before = JSON.stringify(tree)
  preserveHadisNumbers(tree, source, "Hadisler/Muslim/1- Iman.md")
  assert.equal(JSON.stringify(tree), before)
  const list = tree.children[0]
  if (list.type !== "list") throw new Error("Expected list")
  delete list.children[0].position
  preserveHadisNumbers(tree, source, "Hadisler/Buhari/1- Vahy.md")
  assert.equal(list.children[0].data, undefined)
  assert.equal(list.children[1].data?.hProperties?.value, "8")
})

test("anchor promotion preserves unrelated, embedded and ambiguous records", () => {
  const item = (children: Element[]): Element => ({
    type: "element",
    tagName: "li",
    properties: {},
    children,
  })
  const embedded: Element = {
    type: "element",
    tagName: "blockquote",
    properties: { className: ["transclude"] },
    children: [anchor("buhari-99")],
  }
  const single = item([anchor("buhari-1"), embedded])
  const embeddedBefore = JSON.stringify(embedded)
  const ambiguous = item([anchor("buhari-2"), anchor("buhari-3")])
  const missing = item([{ type: "element", tagName: "p", properties: {}, children: [] }])
  const conflict = item([anchor("buhari-4")])
  const existingId = item([anchor("buhari-5")])
  existingId.properties.id = "existing"
  const record = page("buhari/vahy", [
    {
      type: "element",
      tagName: "ol",
      properties: {},
      children: [single, ambiguous, missing, conflict, existingId],
    },
    anchor("buhari-6"),
  ])
  const before = JSON.stringify(record[0])
  promoteBuhariAnchors(record[0], "Hadisler/Müslim/1- İman.md")
  assert.equal(JSON.stringify(record[0]), before)
  const conflictingBlock = anchor("buhari-4")
  const blocks = { "buhari-4": conflictingBlock }
  promoteBuhariAnchors(record[0], record[1].data.relativePath, blocks)
  assert.equal(single.properties.id, "buhari-1")
  assert.equal(ambiguous.properties.id, undefined)
  assert.equal(missing.properties.id, undefined)
  assert.equal(conflict.properties.id, undefined)
  assert.equal(existingId.properties.id, "existing")
  assert.equal(JSON.stringify(embedded), embeddedBefore)
  assert.equal((embedded.children[0] as Element).properties.id, "buhari-99")
  assert.equal((record[0].children[1] as Element).properties.id, "buhari-6")
  assert.equal(blocks["buhari-4"], conflictingBlock)
})
