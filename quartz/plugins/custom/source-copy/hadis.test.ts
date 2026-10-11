import test from "node:test"
import assert from "node:assert/strict"
import type { Element, Root } from "hast"
import { addHadisCopyButtons } from "./hadis"
import { quotedText } from "./format"

test("quotation uses literal double quotes and a short citation without links", () => {
  assert.equal(quotedText("Hadis.\n\nDevamı.", "Buhari 200"), '"Hadis.\n\nDevamı." (Buhari 200)')
  assert.equal(quotedText("Meal.", "Nisa 25"), '"Meal." (Nisa 25)')
  assert.equal(quotedText("Açıklama.", ""), "Açıklama.")
})

function fixture(): { tree: Root; record: Element; unknown: Element } {
  const record: Element = {
    type: "element",
    tagName: "li",
    properties: { id: "buhari-200", value: 200 },
    children: [
      {
        type: "element",
        tagName: "p",
        properties: {},
        children: [
          {
            type: "element",
            tagName: "strong",
            properties: {},
            children: [{ type: "text", value: "Hadis." }],
          },
          { type: "text", value: " Devamı." },
        ],
      },
    ],
  }
  const unknown: Element = {
    type: "element",
    tagName: "li",
    properties: { value: 201 },
    children: [{ type: "text", value: "Kimliksiz kayıt." }],
  }
  return {
    tree: {
      type: "root",
      children: [{ type: "element", tagName: "ol", properties: {}, children: [record, unknown] }],
    },
    record,
    unknown,
  }
}

test("copy action preserves existing record, content, IDs and formatting", () => {
  const { tree, record, unknown } = fixture()
  const originalContent = structuredClone(record.children)
  const originalUnknown = structuredClone(unknown)
  addHadisCopyButtons(tree, "Hadisler/Buhari/4- Kitabul Vudu.md")
  assert.equal(record.properties.id, "buhari-200")
  assert.equal(record.properties.value, 200)
  assert.equal(record.properties.dataCopyHadis, "200")
  const paragraph = record.children[0] as Element
  assert.equal((paragraph.children[0] as Element).tagName, "button")
  assert.deepEqual([{ ...paragraph, children: paragraph.children.slice(1) }], originalContent)
  assert.deepEqual(unknown, originalUnknown)
  const once = structuredClone(tree)
  addHadisCopyButtons(tree, "Hadisler/Buhari/4- Kitabul Vudu.md")
  assert.deepEqual(tree, once)
})

test("does not attach Buhari copy actions to other books or nested records", () => {
  const { tree, record } = fixture()
  const before = structuredClone(tree)
  addHadisCopyButtons(tree, "Hadisler/Müslim/4- Kitabul Vudu.md")
  assert.deepEqual(tree, before)
  const wrapped: Root = {
    type: "root",
    children: [{ type: "element", tagName: "blockquote", properties: {}, children: [record] }],
  }
  addHadisCopyButtons(wrapped, "Hadisler/Buhari/4- Kitabul Vudu.md")
  assert.equal(record.properties.dataCopyHadis, undefined)
})
