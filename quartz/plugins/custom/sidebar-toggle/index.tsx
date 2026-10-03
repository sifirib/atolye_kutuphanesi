import type { FullPageLayout } from "../../../cfg"
import type { QuartzComponent } from "../../../components/types"
// @ts-ignore -- Quartz bundles inline scripts as source text.
import early from "./early.inline"
// @ts-ignore -- Quartz bundles inline scripts as source text.
import script from "./sidebar.inline"

type Layout = {
  defaults: Partial<FullPageLayout>
  byPageType: Record<string, Partial<FullPageLayout>>
}

const SidebarToggle: QuartzComponent = () => (
  <button
    class="library-sidebar-toggle"
    type="button"
    aria-label="Sol paneli kapat"
    title="Sol paneli kapat"
    aria-expanded="true"
    hidden
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
      <path class="sidebar-toggle-arrow" d="m16 9-3 3 3 3" />
    </svg>
  </button>
)
SidebarToggle.displayName = "SidebarToggle"
SidebarToggle.beforeDOMLoaded = early
SidebarToggle.afterDOMLoaded = script

export function withSidebarToggle(layout: Layout): Layout {
  const add = (page: Partial<FullPageLayout>): Partial<FullPageLayout> => ({
    ...page,
    beforeBody: [...(page.beforeBody ?? []), SidebarToggle],
  })
  return {
    defaults: add(layout.defaults),
    byPageType: Object.fromEntries(
      Object.entries(layout.byPageType).map(([type, page]) => [type, add(page)]),
    ),
  }
}
