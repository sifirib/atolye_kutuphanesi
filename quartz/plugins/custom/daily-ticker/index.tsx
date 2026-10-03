import type { FullPageLayout } from "../../../cfg"
import type { QuartzComponent } from "../../../components/types"
// @ts-ignore -- Quartz bundles inline scripts as source text.
import script from "./ticker.inline"

type Layout = {
  defaults: Partial<FullPageLayout>
  byPageType: Record<string, Partial<FullPageLayout>>
}
const DailyTicker: QuartzComponent = () => (
  <section class="daily-ticker" aria-label="Günün ayeti">
    <span class="ticker-label">Günün ayeti</span>
    <div
      class="ticker-viewport"
      tabIndex={0}
      aria-label="Günün ayeti; okumak için odağı buraya getirin"
    >
      <a class="ticker-track" data-no-popover="true">
        <span class="ticker-quote">Kur'an-ı Kerim</span>
        <span class="ticker-quote" aria-hidden="true">
          Kur'an-ı Kerim
        </span>
      </a>
    </div>
    <button
      class="ticker-pause"
      type="button"
      aria-label="Akışı duraklat"
      title="Akışı duraklat"
      aria-pressed="false"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 5v14M15 5v14" />
      </svg>
    </button>
  </section>
)
DailyTicker.displayName = "DailyTicker"
DailyTicker.afterDOMLoaded = script
export function withDailyTicker(layout: Layout): Layout {
  const add = (page: Partial<FullPageLayout>) => ({
    ...page,
    beforeBody: [DailyTicker, ...(page.beforeBody ?? [])],
  })
  return {
    defaults: add(layout.defaults),
    byPageType: Object.fromEntries(
      Object.entries(layout.byPageType).map(([key, page]) => [key, add(page)]),
    ),
  }
}
