import assert from "node:assert/strict"
import { test } from "node:test"
import { clampRect, placeRect, resizeRect, type Place } from "./geometry"

test("a window fits after the browser becomes narrower", () => {
  assert.deepEqual(
    clampRect({ x: 900, y: 700, width: 480, height: 440 }, { width: 360, height: 300 }),
    {
      x: 8,
      y: 8,
      width: 344,
      height: 284,
    },
  )
})

test("opposite snapped halves share a gap without overlapping", () => {
  const viewport = { width: 1200, height: 800 }
  const left = placeRect("left", viewport),
    right = placeRect("right", viewport)
  const top = placeRect("top", viewport),
    bottom = placeRect("bottom", viewport)
  assert.equal(right.x - left.x - left.width, 8)
  assert.equal(bottom.y - top.y - top.height, 8)
  assert.equal(right.x + right.width, 1192)
  assert.equal(bottom.y + bottom.height, 792)
})

test("all placements stay within a narrow desktop viewport", () => {
  const places: Place[] = [
    "left",
    "right",
    "top",
    "bottom",
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
    "full",
  ]
  for (const place of places) {
    const rect = placeRect(place, { width: 420, height: 320 })
    assert.ok(rect.x >= 8 && rect.y >= 8)
    assert.ok(rect.x + rect.width <= 412 && rect.y + rect.height <= 312)
  }
})

test("resizing north-west preserves the opposite corner", () => {
  const start = { x: 100, y: 100, width: 480, height: 440 }
  const result = resizeRect(start, "nw", 1000, 1000, { width: 1200, height: 800 })
  assert.equal(result.width, 280)
  assert.equal(result.height, 180)
  assert.equal(result.x + result.width, start.x + start.width)
  assert.equal(result.y + result.height, start.y + start.height)
})

test("resizing south-east cannot push the window off screen", () => {
  assert.deepEqual(
    resizeRect({ x: 100, y: 100, width: 480, height: 440 }, "se", 2000, 2000, {
      width: 1200,
      height: 800,
    }),
    {
      x: 100,
      y: 100,
      width: 1092,
      height: 692,
    },
  )
})
