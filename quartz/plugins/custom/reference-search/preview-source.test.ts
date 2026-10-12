import test from "node:test"
import assert from "node:assert/strict"
import { matchesPreviewSource } from "./preview-source"

test("matches the actual source across hosting prefixes and encoded Turkish paths", () => {
  const slug = "kur'an-ı-kerim/nisâ"
  assert.ok(
    matchesPreviewSource(
      "https://example.org/atolye_kutuphanesi/kur'an-%C4%B1-kerim/nis%C3%A2",
      slug,
    ),
  )
  assert.ok(matchesPreviewSource("http://localhost:8080/kur'an-ı-kerim/nisâ/", slug))
  assert.ok(
    matchesPreviewSource(
      "https://example.org/library/hadisler/buhari/30--kitabus-savm",
      "hadisler/buhari/30--kitabus-savm",
    ),
  )
})

test("rejects another surah with the same ayet ID and partial filename matches", () => {
  assert.equal(
    matchesPreviewSource("https://example.org/kur'an-ı-kerim/bakara#25", "kur'an-ı-kerim/nisâ"),
    false,
  )
  assert.equal(
    matchesPreviewSource(
      "https://example.org/other-hadisler/buhari/30--kitabus-savm",
      "hadisler/buhari/30--kitabus-savm",
    ),
    false,
  )
  assert.equal(
    matchesPreviewSource(
      "https://example.org/hadisler/buhari/30--kitabus-savm-extra",
      "hadisler/buhari/30--kitabus-savm",
    ),
    false,
  )
})

test("missing, malformed or unrelated source metadata cannot authorize a target", () => {
  for (const source of [
    undefined,
    "",
    "not a URL",
    "https://example.org/%ZZ",
    "https://example.org/",
  ]) {
    assert.equal(matchesPreviewSource(source, "hadisler/buhari/30--kitabus-savm"), false)
  }
  assert.equal(matchesPreviewSource("https://example.org/foo", ""), false)
})
