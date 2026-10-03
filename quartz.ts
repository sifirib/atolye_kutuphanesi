import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { Quran } from "./quartz/plugins/custom/quran"
import { QuranCatalog } from "./quartz/plugins/custom/quran/catalog"
import { withColumnExplorer } from "./quartz/plugins/custom/column-explorer"
import { PageTypeDispatcher } from "./quartz/plugins/pageTypes"
import { withSiteIdentity } from "./quartz/plugins/custom/site-identity"
import { SourceCopy } from "./quartz/plugins/custom/source-copy"
import { Permalinks, guardAliasEmitter } from "./quartz/plugins/custom/source-copy/permalinks"
import { ReadingFonts, withReadingSettings } from "./quartz/plugins/custom/reading-settings"
import { FolderPage } from "@quartz-community/folder-page"
import { TagPage } from "@quartz-community/tag-page"
import { librarySort } from "./quartz/plugins/custom/site-identity/sort"
import { withListLabels } from "./quartz/plugins/custom/site-identity/list-pages"
import { withContinueReading } from "./quartz/plugins/custom/continue-reading"
import { ReadingWindows } from "./quartz/plugins/custom/reading-windows"
import { withSidebarToggle } from "./quartz/plugins/custom/sidebar-toggle"
import { withDailyTicker } from "./quartz/plugins/custom/daily-ticker"
import { DailyTickerData } from "./quartz/plugins/custom/daily-ticker/emitter"
import { withPageEdit } from "./quartz/plugins/custom/page-edit"

const config = await loadQuartzConfig()
config.plugins.transformers.push(
  Quran(),
  SourceCopy(),
  Permalinks(),
  ReadingFonts(),
  ReadingWindows(),
)
config.plugins.emitters.push(QuranCatalog(), DailyTickerData())
config.plugins.pageTypes = config.plugins.pageTypes?.map((page) =>
  withListLabels(
    page.name === "FolderPage"
      ? FolderPage({ sort: librarySort })
      : page.name === "TagPage"
        ? TagPage({ sort: librarySort })
        : page,
  ),
)
export const layout = withPageEdit(
  withDailyTicker(
    withSidebarToggle(
      withContinueReading(
        withReadingSettings(withColumnExplorer(withSiteIdentity(await loadQuartzLayout()))),
      ),
    ),
  ),
  { repository: "sifirib/atolye_kutuphanesi", branch: "v5", contentDirectory: "content" },
)
// The YAML loader creates its dispatcher before project-level layout overrides.
// Replace that instance so rendering and resource collection use the same layout.
config.plugins.emitters = config.plugins.emitters.map((emitter) =>
  emitter.name === "PageTypeDispatcher" ? PageTypeDispatcher(layout) : guardAliasEmitter(emitter),
)
export default config
