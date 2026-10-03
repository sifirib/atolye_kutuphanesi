import type { FullPageLayout } from "../../../cfg"
import type { QuartzComponent } from "../../../components/types"
import { editUrl, type PageEditOptions } from "./url"

type Layout = {
  defaults: Partial<FullPageLayout>
  byPageType: Record<string, Partial<FullPageLayout>>
}

export function PageEdit(options: PageEditOptions): QuartzComponent {
  const component: QuartzComponent = ({ fileData }) => {
    // Virtual folder/tag pages also receive a relativePath, but have no source filePath.
    if (!fileData.filePath) return null
    const href = editUrl(fileData.relativePath, options)
    if (!href) return null
    return (
      <div class="page-edit">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          data-no-popover="true"
          aria-label="Sayfayı düzenle (GitHub’da yeni sekmede açılır)"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m16 3 5 5M3 21l5-1L21 7a2.8 2.8 0 0 0-4-4L4 16l-1 5Z" />
          </svg>
          <span>Sayfayı düzenle</span>
        </a>
      </div>
    )
  }
  component.displayName = "PageEdit"
  return component
}

export function withPageEdit(layout: Layout, options: PageEditOptions): Layout {
  const component = PageEdit(options)
  const add = (page: Partial<FullPageLayout>) => ({
    ...page,
    afterBody: [component, ...(page.afterBody ?? [])],
  })
  return {
    defaults: add(layout.defaults),
    byPageType: Object.fromEntries(
      Object.entries(layout.byPageType).map(([key, page]) => [key, add(page)]),
    ),
  }
}
