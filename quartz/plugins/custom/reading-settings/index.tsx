import { cloneElement, isValidElement, toChildArray, type ComponentChildren } from "preact"
import type { FullPageLayout } from "../../../cfg"
import type { QuartzComponent } from "../../../components/types"
import { concatenateResources } from "../../../util/resources"
import type { QuartzTransformerPlugin } from "../../types"
// @ts-ignore -- Quartz inline script loader
import early from "./early.inline"
// @ts-ignore -- Quartz inline script loader
import script from "./settings.inline"

export const ReadingFonts: QuartzTransformerPlugin = () => ({
  name: "ReadingFonts",
  externalResources: () => ({ css: [{ content: "https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600;700;900&family=Atkinson+Hyperlegible+Next:wght@400;600;700&display=swap", spaPreserve: true }] }),
})
type Layout = { defaults: Partial<FullPageLayout>; byPageType: Record<string, Partial<FullPageLayout>> }
export function withReadingSettings(layout: Layout): Layout {
  const cache = new Map<QuartzComponent, QuartzComponent>()
  function wrap(original: QuartzComponent): QuartzComponent {
    if (cache.has(original)) return cache.get(original)!
    const component: QuartzComponent = (props) => {
      const node = original(props)
      if (!isValidElement(node)) return node
      const attributes = node.props as { class?: string; children?: ComponentChildren }
      if (!attributes.class?.split(/\s+/).includes("flex-component")) return node
      return cloneElement(node, {}, ...toChildArray(attributes.children),
        <button type="button" class="reading-settings-open" aria-label="Ayarlar" title="Ayarlar" aria-haspopup="dialog">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="var(--light)"/><circle cx="15" cy="17" r="3" fill="var(--light)"/></svg>
        </button>)
    }
    component.css = original.css
    component.beforeDOMLoaded = concatenateResources(original.beforeDOMLoaded, early)
    component.afterDOMLoaded = concatenateResources(original.afterDOMLoaded, script)
    cache.set(original, component)
    return component
  }
  const adapt = (page: Partial<FullPageLayout>) => ({ ...page, left: page.left?.map(wrap) })
  return { defaults: adapt(layout.defaults), byPageType: Object.fromEntries(Object.entries(layout.byPageType).map(([key, page]) => [key, adapt(page)])) }
}
