import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { Quran } from "./quartz/plugins/custom/quran"
import { QuranCatalog } from "./quartz/plugins/custom/quran/catalog"
import { withColumnExplorer } from "./quartz/plugins/custom/column-explorer"
import { PageTypeDispatcher } from "./quartz/plugins/pageTypes"
import { withSiteIdentity } from "./quartz/plugins/custom/site-identity"

import { SourceCopy } from "./quartz/plugins/custom/source-copy"
import { Permalinks, guardAliasEmitter } from "./quartz/plugins/custom/source-copy/permalinks"

const config = await loadQuartzConfig()
config.plugins.transformers.push(Quran(), SourceCopy(), Permalinks())
config.plugins.emitters.push(QuranCatalog())
export const layout = withColumnExplorer(withSiteIdentity(await loadQuartzLayout()))
// The YAML loader creates its dispatcher before project-level layout overrides.
// Replace that instance so rendering and resource collection use the same layout.
config.plugins.emitters = config.plugins.emitters.map((emitter) =>
  emitter.name === "PageTypeDispatcher" ? PageTypeDispatcher(layout) : guardAliasEmitter(emitter),
)
export default config
