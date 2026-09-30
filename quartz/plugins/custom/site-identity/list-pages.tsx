import { cloneElement, isValidElement, toChildArray, type ComponentChildren } from "preact"
import type { PageTypePluginEntry } from "../../types"
import type { QuartzComponent } from "../../../components/types"

function labels(node: ComponentChildren, insideArticle = false): ComponentChildren {
  if (typeof node === "string" && !insideArticle) {
    const count = node.match(/^Bu (?:klasör|etiket).*? (\d+) öğe\.$/)
    if (count) return `${count[1]} öğe listelendi.`
  }
  if (!isValidElement(node)) return node
  const props = node.props as { children?: ComponentChildren }
  return cloneElement(node, {}, ...toChildArray(props.children).map((child) => labels(child, insideArticle || node.type === "article")))
}

export function withListLabels(page: PageTypePluginEntry): PageTypePluginEntry {
  if (page.name !== "FolderPage" && page.name !== "TagPage") return page
  return { ...page, body: () => {
    const original = page.body()
    const component: QuartzComponent = (props) => <div class="library-list-page">{labels(original(props))}</div>
    component.css = original.css
    component.beforeDOMLoaded = original.beforeDOMLoaded
    component.afterDOMLoaded = original.afterDOMLoaded
    return component
  } }
}
