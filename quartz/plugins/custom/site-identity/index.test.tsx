import test from "node:test"
import assert from "node:assert/strict"
import render from "preact-render-to-string"
import { Graph } from "@quartz-community/graph"
import DesktopOnly from "../../../components/DesktopOnly"
import ConditionalRender from "../../../components/ConditionalRender"
import type { QuartzComponentProps } from "../../../components/types"
import { withSiteIdentity } from "."

test("graph labels survive desktop and conditional wrappers without changing resources", () => {
  const graph = Graph(undefined)
  const original = DesktopOnly(ConditionalRender({
    component: graph,
    condition: (props) => props.showGraph,
  }))
  const layout = withSiteIdentity({ defaults: { right: [original] }, byPageType: {} })
  const adapted = layout.defaults.right![0]
  const props = { cfg: { locale: "tr-TR" }, showGraph: true } as QuartzComponentProps
  const html = render(adapted(props))
  assert.match(html, /<h3>Site Haritası<\/h3>/)
  assert.match(html, /aria-label="Site haritasını aç"/)
  assert.match(html, /class="desktop-only"/)
  assert.doesNotMatch(html, /Grafik Görünümü|Global Graph/)
  assert.equal(adapted.css, original.css)
  assert.equal(adapted.afterDOMLoaded, original.afterDOMLoaded)
  assert.doesNotMatch(render(adapted({ ...props, showGraph: false })), /Site Haritası|graph-container/)
})
