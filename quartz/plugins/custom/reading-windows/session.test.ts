import assert from "node:assert/strict"
import { test } from "node:test"
import { readSession, writeSession, type SavedWindow } from "./session"

const record: SavedWindow = {
  url: "https://example.org/library/page#5",
  title: "Sayfa",
  rect: { x: 8, y: 10, width: 400, height: 300 },
  freeRect: { x: 20, y: 30, width: 480, height: 440 },
  place: "left",
  minimized: true,
  scrollTop: 912,
}
const reader = (value: unknown) => ({ getItem: () => JSON.stringify(value) })
test("session round-trip preserves placement, minimized state and reading position", () => {
  let raw = ""
  writeSession(
    {
      setItem: (_key, value) => {
        raw = value
      },
    },
    [record],
  )
  assert.deepEqual(readSession({ getItem: () => raw }, "https://example.org"), [record])
})
test("blocked and malformed storage never prevents previews", () => {
  assert.deepEqual(
    readSession(
      {
        getItem: () => {
          throw new Error("denied")
        },
      },
      "https://example.org",
    ),
    [],
  )
  assert.deepEqual(readSession({ getItem: () => "{broken" }, "https://example.org"), [])
  assert.doesNotThrow(() =>
    writeSession(
      {
        setItem: () => {
          throw new Error("quota")
        },
      },
      [record],
    ),
  )
})
test("rejects external URLs, invalid geometry and invalid state while keeping valid records", () => {
  const invalid = [
    { ...record, url: "https://other.org/page" },
    { ...record, url: "javascript:alert(1)" },
    { ...record, rect: { ...record.rect, width: -1 } },
    { ...record, freeRect: null },
    { ...record, place: "unknown" },
    { ...record, scrollTop: -1 },
    { ...record, minimized: "true" },
    null,
  ]
  assert.deepEqual(readSession(reader([...invalid, record]), "https://example.org"), [record])
})
test("deduplicates saved windows without losing order", () => {
  const other = { ...record, url: "https://example.org/other" }
  assert.deepEqual(readSession(reader([record, other, record]), "https://example.org"), [
    record,
    other,
  ])
})
test("empty workspace replaces previously saved windows", () => {
  let raw = JSON.stringify([record])
  writeSession(
    {
      setItem: (_key, value) => {
        raw = value
      },
    },
    [],
  )
  assert.deepEqual(readSession({ getItem: () => raw }, "https://example.org"), [])
})
