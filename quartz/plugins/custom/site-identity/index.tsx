import { cloneElement, isValidElement, toChildArray, type ComponentChildren } from "preact"
import type { FullPageLayout } from "../../../cfg"
import type { QuartzComponent } from "../../../components/types"

type Layout = {
  defaults: Partial<FullPageLayout>
  byPageType: Record<string, Partial<FullPageLayout>>
}

// Adapt the rendered labels without copying the package's graph implementation
// or changing its selectors, configuration and client-side resources.
function graphLabels(node: ComponentChildren): ComponentChildren {
  if (!isValidElement(node)) return node
  const props = node.props as { children?: ComponentChildren; class?: string }
  if (node.type === "h3") return cloneElement(node, {}, "Site Haritası")
  const isGraphButton = props.class?.split(/\s+/).includes("global-graph-icon")
  return cloneElement(
    node,
    isGraphButton ? { "aria-label": "Site haritasını aç" } : {},
    ...toChildArray(props.children).map(graphLabels),
  )
}

function withLabels(Original: QuartzComponent): QuartzComponent {
  const Component: QuartzComponent = (props) => {
    const rendered = Original(props)
    if (!isValidElement(rendered)) return rendered
    const attributes = rendered.props as { children?: ComponentChildren; class?: string }
    if (attributes.class?.split(/\s+/).includes("graph")) return graphLabels(rendered)
    if (rendered.type === "footer") {
      const children = toChildArray(attributes.children)
      return cloneElement(rendered, {},
        <p>
          <a href="https://www.youtube.com/@xVxYapm">xVx Yapım</a>
          {` © ${new Date().getFullYear()}`}
        </p>,
        ...children.filter((child) => !isValidElement(child) || child.type !== "p"),
      )
    }
    return rendered
  }
  Component.displayName = `SiteIdentity(${Original.displayName ?? Original.name})`
  Component.css = Original.css
  Component.beforeDOMLoaded = Original.beforeDOMLoaded
  Component.afterDOMLoaded = Original.afterDOMLoaded
  return Component
}

export function withSiteIdentity(layout: Layout): Layout {
  const cache = new Map<QuartzComponent, QuartzComponent>()
  const wrap = (component: QuartzComponent) => {
    if (!cache.has(component)) cache.set(component, withLabels(component))
    return cache.get(component)!
  }
  const adapt = (page: Partial<FullPageLayout>): Partial<FullPageLayout> => ({
    ...page,
    right: page.right?.map(wrap),
    footer: page.footer?.map(wrap),
  })
  return {
    defaults: adapt(layout.defaults),
    byPageType: Object.fromEntries(
      Object.entries(layout.byPageType).map(([type, page]) => [type, adapt(page)]),
    ),
  }
}
