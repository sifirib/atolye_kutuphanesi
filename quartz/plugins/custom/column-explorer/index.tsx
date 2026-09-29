import type { FullPageLayout } from "../../../cfg"
import type { QuartzComponent, QuartzComponentConstructor } from "../../../components/types"
import { componentRegistry } from "../../../components/registry"
import { concatenateResources } from "../../../util/resources"
import style from "./column-explorer.scss"
// @ts-ignore -- Quartz imports inline scripts as bundled source text.
import script from "./column-explorer.inline"

type Layout = {
  defaults: Partial<FullPageLayout>
  byPageType: Record<string, Partial<FullPageLayout>>
}

function columnExplorer(Original: QuartzComponent): QuartzComponent {
  const Explorer: QuartzComponent = (props) => (
    <div class="cx-explorer" data-cx-popovers={String(props.cfg.enablePopovers)}>
      <Original {...props} />
      <nav class="cx-columns" aria-label="Raflar" hidden>
        <div class="cx-root-title">
          <span>Raflar</span>
          <button type="button" class="cx-search-open" data-cx-search-open aria-label="Raflarda ara" aria-expanded="false" title="Raflarda ara" disabled>
            <svg class="cx-search-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m16 16 4.5 4.5" />
            </svg>
          </button>
        </div>
        <div class="cx-search" role="search" aria-label="Raflarda ara" hidden>
          <svg class="cx-search-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m16 16 4.5 4.5" />
          </svg>
          <input
            class="cx-search-input"
            type="search"
            placeholder="Raflarda ara…"
            aria-label="Tüm klasörlerde dosya veya klasör ara"
            autoComplete="off"
            spellcheck={false}
            disabled
          />
          <button type="button" class="cx-search-clear" data-cx-clear aria-label="Aramayı kapat" title="Aramayı kapat">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" /></svg>
          </button>
        </div>
        <div class="cx-search-summary" role="status" aria-live="polite" hidden />
        <div class="cx-pin-status" role="status" aria-live="polite" />
        <div class="cx-root-body">
          <p class="cx-status" role="status">Dosyalar yükleniyor…</p>
        </div>
      </nav>
    </div>
  )
  Explorer.displayName = "ColumnExplorer"
  Explorer.css = concatenateResources(Original.css, style)
  Explorer.beforeDOMLoaded = Original.beforeDOMLoaded
  Explorer.afterDOMLoaded = concatenateResources(Original.afterDOMLoaded, script)
  return Explorer
}

// Reuse the same cached component the YAML loader placed in the layout.
// This keeps the existing tree, options and resources intact.
export function withColumnExplorer(layout: Layout): Layout {
  const registered = componentRegistry.get("Explorer")
  if (!registered) throw new Error("Column Explorer: the Explorer component is not registered")
  const Original = componentRegistry.instantiate(
    registered.component as QuartzComponentConstructor,
  )
  const Columns = columnExplorer(Original)
  let replaced = false
  const replace = (page: Partial<FullPageLayout>): Partial<FullPageLayout> => ({
    ...page,
    left: page.left?.map((component) => {
      if (component !== Original) return component
      replaced = true
      return Columns
    }),
  })
  const result = {
    defaults: replace(layout.defaults),
    byPageType: Object.fromEntries(
      Object.entries(layout.byPageType).map(([type, page]) => [type, replace(page)]),
    ),
  }
  if (!replaced) throw new Error("Column Explorer: no matching Explorer instance in the layout")
  return result
}
