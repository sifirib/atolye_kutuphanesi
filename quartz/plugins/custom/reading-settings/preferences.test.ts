import test from "node:test"
import assert from "node:assert/strict"
import { defaults, migrate, validate } from "./preferences"

test("invalid stored preferences fall back field by field", () => {
  assert.deepEqual(validate(null), defaults)
  assert.deepEqual(validate({ font: "unknown", size: 24, width: "broken", palette: "paper" }), { ...defaults, size: 24, palette: "atolye" })
  assert.equal(validate({ size: "24" }).size, 17)
})
test("v4 radio values migrate without keeping percentage widths", () => {
  assert.deepEqual(migrate({ radioFont: "Tahoma", radioFontSize: "19", radioWidth: "60" }), { ...defaults, font: "Tahoma", size: 19, width: "narrow" })
  assert.deepEqual(migrate({ radioFontSize: "garbage" }), defaults)
})

test("ticker visibility survives storage and defaults on for older preferences", () => {
  assert.equal(validate(JSON.parse(JSON.stringify({ ...defaults, ticker: false }))).ticker, false)
  assert.equal(validate({ font: "Tahoma", size: 19 }).ticker, true)
  assert.equal(validate({ ticker: "false" }).ticker, true)
})
