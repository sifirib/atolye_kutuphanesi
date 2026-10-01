import type { FullPageLayout } from "../../../cfg"
import type { QuartzComponent } from "../../../components/types"
import style from "./continue-reading.scss"
// @ts-ignore -- Quartz imports inline scripts as bundled source text.
import script from "./continue-reading.inline"

type Layout = {
  defaults: Partial<FullPageLayout>
  byPageType: Record<string, Partial<FullPageLayout>>
}

const ContinueReading: QuartzComponent = () => (
  <div class="continue-reading" hidden>
    <button
      type="button"
      class="continue-reading-button"
      data-continue="top"
      aria-label="Başa dön"
      title="Başa dön"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m6 11 6-6 6 6M12 5v14" />
      </svg>
    </button>
    <button
      type="button"
      class="continue-reading-button"
      data-continue="position"
      aria-label="Kaldığın yerden devam et"
      title="Kaldığın yerden devam et"
      hidden
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 4.5A1.5 1.5 0 0 1 8.5 3h7A1.5 1.5 0 0 1 17 4.5V21l-5-3-5 3V4.5Z" />
      </svg>
    </button>
    <button
      type="button"
      class="continue-reading-button"
      data-continue="bottom"
      aria-label="Sayfanın sonuna git"
      title="Sayfanın sonuna git"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5v14m0 0 6-6m-6 6-6-6" />
      </svg>
    </button>
  </div>
)

ContinueReading.displayName = "ContinueReading"
ContinueReading.css = style
ContinueReading.afterDOMLoaded = script

export function withContinueReading(layout: Layout): Layout {
  const addComponent = (page: Partial<FullPageLayout>): Partial<FullPageLayout> => ({
    ...page,
    beforeBody: [...(page.beforeBody ?? []), ContinueReading],
  })

  return {
    defaults: addComponent(layout.defaults),
    byPageType: Object.fromEntries(
      Object.entries(layout.byPageType).map(([type, page]) => [type, addComponent(page)]),
    ),
  }
}
