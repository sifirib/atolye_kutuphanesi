import assert from "node:assert/strict"
import { test } from "node:test"
import { resolveSiteUrl } from "./site-url"

test("resolves site resources at the root and under a deployment subdirectory", () => {
  for (const prefix of ["", "/atolye_kutuphanesi"]) {
    const base = `https://example.com${prefix}`
    for (const [slug, route] of [
      ["index", "/"],
      ["index", "/index"],
      ["hadisler/buhari/1--vahy", "/hadisler/buhari/1--vahy"],
      ["hadisler/buhari/index", "/hadisler/buhari/"],
      ["kur'an-ı-kerim/fâtiha", "/kur'an-%C4%B1-kerim/f%C3%A2tiha"],
    ]) {
      assert.equal(
        resolveSiteUrl("static/buhari-catalog.json", slug, base + route).href,
        `${base}/static/buhari-catalog.json`,
      )
      assert.equal(
        resolveSiteUrl("/hadisler/buhari/1--vahy", slug, base + route).href,
        `${base}/hadisler/buhari/1--vahy`,
      )
    }
  }
})

test("retains the hosting prefix on shallow SPA aliases", () => {
  assert.equal(
    resolveSiteUrl(
      "static/buhari-catalog.json",
      "hadisler/buhari/1--vahy",
      "https://example.com/atolye_kutuphanesi/Buhari-1",
      "/atolye_kutuphanesi",
    ).href,
    "https://example.com/atolye_kutuphanesi/static/buhari-catalog.json",
  )
  assert.equal(
    resolveSiteUrl(
      "hadisler/buhari/25--kitabul-hacc",
      "hadisler/buhari/1--vahy",
      "http://localhost:8080/Buhari-1",
      "/atolye_kutuphanesi",
    ).href,
    "http://localhost:8080/hadisler/buhari/25--kitabul-hacc",
  )
})
