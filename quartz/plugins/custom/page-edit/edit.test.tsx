import assert from "node:assert/strict"
import { test } from "node:test"
import renderToString from "preact-render-to-string"
import type { QuartzComponentProps } from "../../../components/types"
import { PageEdit } from "./index"
import { editUrl, type PageEditOptions } from "./url"

const options: PageEditOptions = {
  repository: "sifirib/atolye_kutuphanesi",
  branch: "v5",
  contentDirectory: "content",
}
const base = "https://github.com/sifirib/atolye_kutuphanesi/edit/v5/content/"

test("encodes source filenames per segment, including Turkish, spaces and URL delimiters", () => {
  assert.equal(
    editUrl("Kur'an-ı Kerim/Âl-i İmrân.md", options),
    `${base}Kur%27an-%C4%B1%20Kerim/%C3%82l-i%20%C4%B0mr%C3%A2n.md`,
  )
  assert.equal(editUrl("Notlar/100% #1?.md", options), `${base}Notlar/100%25%20%231%3F.md`)
  assert.equal(
    editUrl("Hadisler\\Buhari\\1- Vahy.md", options),
    `${base}Hadisler/Buhari/1-%20Vahy.md`,
  )
})

test("keeps index.md and uses configured repository, branch and content directory", () => {
  assert.equal(editUrl("index.md", options), `${base}index.md`)
  assert.equal(
    editUrl("index.md", {
      repository: "owner/library",
      branch: "main",
      contentDirectory: "notes/library",
    }),
    "https://github.com/owner/library/edit/main/notes/library/index.md",
  )
})

test("does not create edit links for missing, generated or invalid source paths", () => {
  for (const path of [
    undefined,
    null,
    "",
    "tags/index",
    "image.png",
    "/index.md",
    "C:\\notes\\index.md",
    "../index.md",
    "folder//index.md",
    "folder/./index.md",
    "bad\0.md",
  ])
    assert.equal(editUrl(path, options), undefined)
})

test("a page alias does not change its edit target; generated pages render no link", () => {
  const component = PageEdit(options)
  const props = {
    fileData: {
      filePath: "content/Hadisler/Buhari/1- Vahy.md",
      slug: "different-public-address",
      relativePath: "Hadisler/Buhari/1- Vahy.md",
      frontmatter: { aliases: ["another-address"] },
    },
  } as unknown as QuartzComponentProps
  const html = renderToString(component(props))
  assert.ok(html.includes(`${base}Hadisler/Buhari/1-%20Vahy.md`))
  assert.ok(html.includes('target="_blank"'))
  assert.ok(html.includes('rel="noopener noreferrer"'))
  assert.ok(html.includes("Sayfayı düzenle"))
  assert.equal(
    component({
      fileData: { slug: "tags/index", relativePath: "tags/index.md" },
    } as QuartzComponentProps),
    null,
  )
})
