import assert from "node:assert/strict"
import { test } from "node:test"
import type { Element, Root } from "hast"
import { collectAyets, dailyAyet, dayNumber, nextDayDelay } from "./data"

const node = (
  tagName: string,
  classes: string[],
  children: Element["children"],
  id?: string,
): Element => ({
  type: "element",
  tagName,
  properties: { className: classes, ...(id ? { id } : {}) },
  children,
})
const text = (value: string) => ({ type: "text" as const, value })
test("takes the whole published meal and original block ID, without the Arabic or controls", () => {
  const tree: Root = {
    type: "root",
    children: [
      node(
        "div",
        ["quran-verse"],
        [
          node("div", ["quran-arabic"], [text("عربي")]),
          node(
            "div",
            ["quran-translation"],
            [text("Bir "), node("strong", [], [text("ayet")]), text(".\n Tam metin.")],
          ),
          node("button", ["ayet-copy"], [text("Kopyala")]),
        ],
        "153",
      ),
    ],
  }
  assert.deepEqual(collectAyets(tree, "kur'an-ı-kerim/bakara", "Bakara", 2), [
    {
      slug: "kur'an-ı-kerim/bakara",
      name: "Bakara",
      ayet: 153,
      text: "Bir ayet. Tam metin.",
    },
  ])
})
test("does not include transcluded ayets or ayets outside the selected pool", () => {
  const ayet = node(
    "div",
    ["quran-verse"],
    [node("div", ["quran-translation"], [text("Meal")])],
    "153",
  )
  const tree: Root = {
    type: "root",
    children: [
      node("blockquote", ["transclude"], [ayet]),
      { ...ayet, properties: { ...ayet.properties, id: "10" } },
    ],
  }
  assert.deepEqual(collectAyets(tree, "bakara", "Bakara", 2), [])
  assert.deepEqual(collectAyets({ type: "root", children: [ayet] }, "unknown", "Unknown", 99), [])
})
test("the quote remains the same during an Istanbul calendar day", () => {
  const entries = [1, 2, 3].map((ayet) => ({ slug: "page", name: "Sure", ayet, text: "Meal" }))
  assert.deepEqual(
    dailyAyet(entries, new Date("2026-10-03T21:01:00Z")),
    dailyAyet(entries, new Date("2026-10-04T20:59:00Z")),
  )
  assert.notDeepEqual(
    dailyAyet(entries, new Date("2026-10-04T20:59:59Z")),
    dailyAyet(entries, new Date("2026-10-04T21:00:00Z")),
  )
})
test("schedules exactly the next Istanbul midnight, including milliseconds", () => {
  assert.equal(nextDayDelay(new Date("2026-10-04T20:59:59.900Z")), 200)
  assert.equal(nextDayDelay(new Date("2026-10-04T21:00:00.000Z")), 86400100)
  assert.equal(
    dayNumber(new Date("2026-12-31T21:00:00Z")),
    dayNumber(new Date("2027-01-01T12:00:00Z")),
  )
})
test("an empty published pool has no quote", () => {
  assert.equal(dailyAyet([], new Date()), undefined)
})
