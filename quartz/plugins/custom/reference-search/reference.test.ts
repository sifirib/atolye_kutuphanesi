import assert from "node:assert/strict"
import { test } from "node:test"
import type { BuhariEntry } from "../buhari/catalog-data"
import type { SurahEntry } from "../quran/catalog"
import { findReference, parseReference } from "./reference"

const buhari: BuhariEntry[] = [
  { slug: "hadisler/buhari/4--kitabul-vudu", numbers: [200, 202] },
  { slug: "hadisler/buhari/11--kitabul-cuma", numbers: [800, 801] },
]
const surahs: SurahEntry[] = [
  { slug: "kur'an-ı-kerim/nisâ", name: "Nisâ", number: 4, verses: [1, 25, 176] },
  { slug: "kur'an-ı-kerim/âl-i-i̇mrân", name: "Âl-i İmrân", number: 3, verses: [1, 25, 200] },
  { slug: "kur'an-ı-kerim/en'âm", name: "En'âm", number: 6, verses: [1, 25, 165] },
  { slug: "kur'an-ı-kerim/nâs", name: "Nâs", number: 114, verses: [1, 2, 6] },
  { slug: "kur'an-ı-kerim/nasr", name: "Nasr", number: 110, verses: [1, 2, 3] },
  { slug: "kur'an-ı-kerim/saf", name: "Saf", number: 61, verses: [1, 2, 14] },
  { slug: "kur'an-ı-kerim/sâffât", name: "Sâffât", number: 37, verses: [1, 2, 182] },
]

function lookup(text: string, hadis = buhari, ayet = surahs) {
  const query = parseReference(text)
  return query ? findReference(query, hadis, ayet) : undefined
}

test("parses Turkish case, circumflexes and whitespace without changing the reference number", () => {
  for (const text of ["Buhari 200", "Buhârî 200", "BUHARI 200", "  BUHÂRÎ\t200  "]) {
    assert.deepEqual(parseReference(text), { name: "buhari", number: 200, kind: "hadis" })
  }
  for (const text of ["Nisa 25", "Nisâ 25", "NISA 25", "NİSÂ 25", "  Nisâ   25  "]) {
    assert.deepEqual(parseReference(text), { name: "nisa", number: 25, kind: "ayet" })
  }
})

test("folds punctuation within actual surah names, including combining marks", () => {
  for (const text of [
    "Âl-i İmrân 25",
    "Ali Imran 25",
    "Al i Imran 25",
    "Âl-i İmrân 25".normalize("NFD"),
  ]) {
    assert.deepEqual(parseReference(text), { name: "aliimran", number: 25, kind: "ayet" })
  }
  for (const text of ["En'âm 25", "En’âm 25", "Enʻâm 25", "Enʼâm 25", "Enam 25"]) {
    assert.deepEqual(parseReference(text), { name: "enam", number: 25, kind: "ayet" })
  }
})

test("rejects invalid numeric syntax and additional reference text before name folding", () => {
  for (const text of [
    "",
    "Buhari",
    "200",
    "Buhari 0",
    "Nisa 0",
    "Nisa -25",
    "Nisa +25",
    "Nisa 2.5",
    "Nisa 2,5",
    "Buhari 2e2",
    "Buhari 200-202",
    "Nisa 25/26",
    "Buhari 0200",
    "Buhari 10000",
    "Nisa 1000",
    "Buhari 200 ekstra",
    "Buhari 200 Nisa 25",
  ]) {
    assert.equal(parseReference(text), undefined, text)
  }
  assert.deepEqual(parseReference("Buhari 9999"), { name: "buhari", number: 9999, kind: "hadis" })
})

test("resolves a hadis only to its published page and exact Buhari block ID", () => {
  for (const text of ["Buhari 200", "Buhârî 200", "BUHARI 200"]) {
    assert.deepEqual(lookup(text), {
      slug: "hadisler/buhari/4--kitabul-vudu",
      hash: "buhari-200",
      title: "Buhari 200",
      kind: "hadis",
    })
  }
  assert.equal(lookup("Buhari 800")?.slug, "hadisler/buhari/11--kitabul-cuma")
})

test("resolves ayet names to the catalog slug rather than deriving a URL from the query", () => {
  for (const text of ["Nisa 25", "Nisâ 25", "NISA 25"]) {
    assert.deepEqual(lookup(text), {
      slug: "kur'an-ı-kerim/nisâ",
      hash: "25",
      title: "Nisâ 25",
      kind: "ayet",
    })
  }
  assert.equal(lookup("Ali Imran 25")?.slug, "kur'an-ı-kerim/âl-i-i̇mrân")
  assert.equal(lookup("Enam 25")?.slug, "kur'an-ı-kerim/en'âm")
})

test("keeps similarly named surahs distinct and never uses prefix or fuzzy matching", () => {
  for (const [text, slug] of [
    ["Nas 2", "kur'an-ı-kerim/nâs"],
    ["Nasr 2", "kur'an-ı-kerim/nasr"],
    ["Saf 2", "kur'an-ı-kerim/saf"],
    ["Saffat 2", "kur'an-ı-kerim/sâffât"],
  ]) {
    assert.equal(lookup(text)?.slug, slug, text)
  }
  for (const text of ["Ni 25", "Nisaa 25", "Saffa 2", "Buhar 200", "Hadis Buhari 200"]) {
    assert.equal(lookup(text), undefined, text)
  }
})

test("does not infer missing destinations from a numeric interval or another collection", () => {
  for (const text of ["Buhari 201", "Buhari 203", "Buhari 9999", "Nisa 24", "Nisa 200", "Nas 25"]) {
    assert.equal(lookup(text), undefined, text)
  }
  assert.equal(lookup("Buhari 200", [], surahs), undefined)
  assert.equal(lookup("Nisa 25", buhari, []), undefined)
})

test("refuses duplicate hadis numbers both within one entry and across pages", () => {
  assert.equal(lookup("Buhari 200", [{ ...buhari[0], numbers: [200, 200] }]), undefined)
  assert.equal(
    lookup("Buhari 200", [buhari[0], { slug: "hadisler/buhari/other-page", numbers: [200] }]),
    undefined,
  )
  assert.equal(
    lookup("Buhari 202", [buhari[0], { slug: "hadisler/buhari/other-page", numbers: [200] }])?.hash,
    "buhari-202",
  )
})

test("refuses ambiguous normalized surah names even when only one has the requested ayet", () => {
  const duplicate = { ...surahs[0], name: "Nisa", slug: "kur'an-ı-kerim/another-nisa" }
  assert.equal(lookup("Nisa 25", buhari, [surahs[0], duplicate]), undefined)
  assert.equal(lookup("Nisa 25", buhari, [surahs[0], { ...duplicate, verses: [1] }]), undefined)
  assert.equal(lookup("Nisa 25", buhari, [duplicate, surahs[0]]), undefined)
})

test("does not modify the caller's catalog entries or number arrays", () => {
  const hadis: BuhariEntry[] = [{ slug: "hadisler/buhari/4--kitabul-vudu", numbers: [202, 200] }]
  const ayet: SurahEntry[] = [
    { slug: "kur'an-ı-kerim/nisâ", name: "Nisâ", number: 4, verses: [176, 25, 1] },
  ]
  const before = JSON.stringify([hadis, ayet])
  lookup("Buhari 200", hadis, ayet)
  lookup("Nisa 25", hadis, ayet)
  assert.equal(JSON.stringify([hadis, ayet]), before)
})
