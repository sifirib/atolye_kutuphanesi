import assert from "node:assert/strict"
import { test } from "node:test"
import { loadBuhariCatalog } from "./catalog-client"

test("loads lazily from the site subpath, shares requests and retries failures", async () => {
  const originalFetch = globalThis.fetch
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document")
  const originalLocation = Object.getOwnPropertyDescriptor(globalThis, "location")
  const urls: string[] = []
  const entries = [{ slug: "Hadisler/Buhari/1-Vahy", numbers: [1, 2] }]
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { body: { dataset: { basepath: "/atolye_kutuphanesi" } } },
  })
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { href: "https://example.com/atolye_kutuphanesi/" },
  })
  globalThis.fetch = async (url) => {
    urls.push(String(url))
    if (urls.length === 1) return new Response("", { status: 503 })
    if (urls.length === 2) return Response.json([{ slug: "bad", numbers: null }])
    return Response.json(entries)
  }
  try {
    assert.equal(urls.length, 0)
    const first = loadBuhariCatalog()
    assert.equal(loadBuhariCatalog(), first)
    await assert.rejects(first, /yüklenemedi/)
    await assert.rejects(loadBuhariCatalog(), /geçersiz/)
    const retry = loadBuhariCatalog()
    assert.deepEqual(await retry, entries)
    assert.equal(loadBuhariCatalog(), retry)
    assert.deepEqual(
      urls,
      Array(3).fill("https://example.com/atolye_kutuphanesi/static/buhari-catalog.json"),
    )
  } finally {
    globalThis.fetch = originalFetch
    if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument)
    else Reflect.deleteProperty(globalThis, "document")
    if (originalLocation) Object.defineProperty(globalThis, "location", originalLocation)
    else Reflect.deleteProperty(globalThis, "location")
  }
})
