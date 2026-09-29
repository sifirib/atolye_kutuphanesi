import assert from "node:assert/strict"
import { test } from "node:test"
import { readPins } from "./pins"

test("stored pins preserve order and discard duplicate or invalid identifiers", () => {
  assert.deepEqual([...readPins('["Hadisler/Buhari",null,42,"","Hadisler/Buhari","Not"]')],
    ["Hadisler/Buhari", "Not"])
})

test("missing, malformed or incompatible storage does not break navigation", () => {
  for (const value of [null, "{", "null", "42", '{"old":"format"}']) {
    assert.equal(readPins(value).size, 0)
  }
})
