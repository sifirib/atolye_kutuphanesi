import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { runInNewContext } from "node:vm"
import ts from "typescript"

const script = ts.transpileModule(
  readFileSync(new URL("./continue-reading.inline.ts", import.meta.url), "utf8"),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } },
).outputText

function fixture(options: { blocked?: boolean; reduced?: boolean; saved?: string } = {}) {
  const writes: string[] = []
  const scrolls: Array<{ top: number; behavior: string }> = []
  const cleanup: Array<() => void> = []
  const timers = new Map<number, () => void>()
  let timerId = 0
  class Button extends EventTarget {
    dataset: { continue: string }
    hidden = true
    blurred = false
    constructor(action: string) {
      super()
      this.dataset = { continue: action }
    }
    closest() {
      return this
    }
    blur() {
      this.blurred = true
    }
  }
  const positionButton = new Button("position")
  const container = Object.assign(new EventTarget(), {
    hidden: true,
    querySelector: () => positionButton,
  })
  const document = Object.assign(new EventTarget(), {
    hidden: false,
    body: { dataset: { slug: "hadisler/buhari" } },
    documentElement: { scrollHeight: 10000 },
    querySelector: () => container,
  })
  const window = Object.assign(new EventTarget(), {
    scrollY: 0,
    innerHeight: 800,
    addCleanup: (fn: () => void) => cleanup.push(fn),
    matchMedia: () => ({ matches: !!options.reduced }),
    scrollTo: (value: { top: number; behavior: string }) => scrolls.push({ ...value }),
  })
  runInNewContext(script, {
    window,
    document,
    AbortController,
    Element: Button,
    localStorage: {
      getItem: () => {
        if (options.blocked) throw new Error("denied")
        return options.saved ?? "1200"
      },
      setItem: (_key: string, value: string) => {
        if (options.blocked) throw new Error("denied")
        writes.push(value)
      },
    },
    setTimeout: (fn: () => void) => {
      timers.set(++timerId, fn)
      return timerId
    },
    clearTimeout: (id: number) => timers.delete(id),
  })
  document.dispatchEvent(new Event("nav"))
  return {
    writes,
    scrolls,
    window,
    document,
    positionButton,
    scroll(y: number) {
      window.scrollY = y
      window.dispatchEvent(new Event("scroll"))
    },
    settle() {
      for (const fn of [...timers.values()]) fn()
    },
    cleanup() {
      cleanup.forEach((fn) => fn())
    },
    click(action: string) {
      const button = new Button(action)
      const event = new Event("click")
      Object.defineProperty(event, "target", { value: button })
      container.dispatchEvent(event)
      return button
    },
  }
}

test("a burst of scroll events saves only the latest position", () => {
  const page = fixture()
  for (let y = 100; y <= 1500; y += 100) page.scroll(y)
  assert.deepEqual(page.writes, [])
  page.settle()
  assert.deepEqual(page.writes, ["1500"])
  page.cleanup()
  assert.deepEqual(page.writes, ["1500"])
})
test("pagehide flushes the last position without waiting for a timer", () => {
  const page = fixture()
  page.scroll(2500)
  page.window.dispatchEvent(new Event("pagehide"))
  page.settle()
  assert.deepEqual(page.writes, ["2500"])
})
test("SPA cleanup saves the old page position and removes its listeners", () => {
  const page = fixture()
  page.scroll(3500)
  page.window.scrollY = 0
  page.cleanup()
  page.scroll(500)
  page.window.dispatchEvent(new Event("pagehide"))
  page.settle()
  assert.deepEqual(page.writes, ["3500"])
})
test("tab hiding flushes pending writes and blocked storage does not throw", () => {
  const page = fixture()
  page.scroll(1800)
  page.document.hidden = true
  page.document.dispatchEvent(new Event("visibilitychange"))
  assert.deepEqual(page.writes, ["1800"])
  assert.doesNotThrow(() => {
    const blocked = fixture({ blocked: true })
    blocked.scroll(900)
    blocked.settle()
    blocked.cleanup()
  })
})
test("all navigation actions respect reduced motion and retain keyboard focus", () => {
  for (const reduced of [false, true]) {
    const page = fixture({ reduced })
    for (const action of ["top", "position", "bottom"])
      assert.equal(page.click(action).blurred, false)
    assert.deepEqual(
      page.scrolls,
      [0, 1200, 10000].map((top) => ({ top, behavior: reduced ? "instant" : "smooth" })),
    )
  }
})
test("invalid stored positions are not offered as a resume target", () => {
  for (const saved of ["NaN", "Infinity", "-100", "broken"]) {
    assert.equal(fixture({ saved }).positionButton.hidden, true)
  }
})
