import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { runInNewContext } from "node:vm"
import ts from "typescript"

const script = ts.transpileModule(
  readFileSync(new URL("./ticker.inline.ts", import.meta.url), "utf8").replace(
    /^import .*\n/gm,
    "",
  ),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } },
).outputText

function fixture(enabled = true, isDesktop = true) {
  const desktop = Object.assign(new EventTarget(), { matches: isDesktop })
  const timers = new Set<number>()
  let fetches = 0
  let observing = false
  let nextTimer = 0
  let finish!: (value: unknown) => void
  const response = new Promise((resolve) => {
    finish = resolve
  })
  const quote = { textContent: "", offsetWidth: 400 }
  const button = { setAttribute() {}, querySelector: () => ({ setAttribute() {} }) }
  const link = { href: "" }
  const bar = {
    dataset: {},
    style: { setProperty() {} },
    querySelector: (selector: string) =>
      selector === ".ticker-track" ? link : selector === ".ticker-pause" ? button : quote,
    querySelectorAll: () => [quote],
    setAttribute() {},
  }
  const document = Object.assign(new EventTarget(), {
    hidden: false,
    documentElement: { dataset: { dailyTicker: enabled ? "on" : "off" } },
    querySelector: (selector: string) =>
      selector === ".daily-ticker" ? bar : { clientWidth: 500 },
  })
  runInNewContext(script, {
    document,
    matchMedia: () => desktop,
    Date,
    URL,
    location: { href: "https://example.com/library/" },
    localStorage: { getItem: () => null },
    resolveBasePath: (path: string) => path,
    dailyAyet: (entries: unknown[]) => entries[0],
    nextDayDelay: () => 86400000,
    requestAnimationFrame: (fn: () => void) => fn(),
    clearTimeout: (id: number) => timers.delete(id),
    window: {
      setTimeout: () => {
        timers.add(++nextTimer)
        return nextTimer
      },
    },
    ResizeObserver: class {
      observe() {
        observing = true
      }
      disconnect() {
        observing = false
      }
    },
    fetch: () => {
      fetches++
      return response
    },
  })
  return {
    timers,
    get fetches() {
      return fetches
    },
    get observing() {
      return observing
    },
    toggle(enabled: boolean) {
      document.documentElement.dataset.dailyTicker = enabled ? "on" : "off"
      document.dispatchEvent(new Event("daily-ticker-change"))
    },
    async finish() {
      finish({
        ok: true,
        json: async () => [{ slug: "bakara", name: "Bakara", ayet: 153, text: "Meal" }],
      })
      await new Promise((resolve) => setImmediate(resolve))
    },
    nav() {
      document.dispatchEvent(new Event("nav"))
    },
    input(isDesktop: boolean) {
      desktop.matches = isDesktop
      desktop.dispatchEvent(new Event("change"))
    },
  }
}

test("a disabled ticker does not fetch, observe or schedule work across page navigation", () => {
  const page = fixture(false)
  page.nav()
  assert.equal(page.fetches, 0)
  assert.equal(page.observing, false)
  assert.equal(page.timers.size, 0)
})

test("mobile skips ticker work and switching input modes stops desktop work", async () => {
  const page = fixture(true, false)
  page.nav()
  assert.equal(page.fetches, 0)
  assert.equal(page.observing, false)
  assert.equal(page.timers.size, 0)
  page.input(true)
  assert.equal(page.fetches, 1)
  page.input(false)
  await page.finish()
  assert.equal(page.observing, false)
  assert.equal(page.timers.size, 0)
})

test("disabling during loading stops work; re-enabling reuses the loaded ayets", async () => {
  const page = fixture()
  assert.equal(page.fetches, 1)
  page.toggle(false)
  await page.finish()
  assert.equal(page.observing, false)
  assert.equal(page.timers.size, 0)
  page.toggle(true)
  assert.equal(page.fetches, 1)
  assert.equal(page.observing, true)
  assert.equal(page.timers.size, 1)
})
