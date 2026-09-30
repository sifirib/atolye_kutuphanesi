import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { Quran } from "./quartz/plugins/custom/quran"
import { QuranCatalog } from "./quartz/plugins/custom/quran/catalog"
import { withColumnExplorer } from "./quartz/plugins/custom/column-explorer"
import { PageTypeDispatcher } from "./quartz/plugins/pageTypes"
import { withSiteIdentity } from "./quartz/plugins/custom/site-identity"

const config = await loadQuartzConfig()
config.plugins.transformers.push(Quran())
config.plugins.emitters.push(QuranCatalog())
export const layout = withColumnExplorer(withSiteIdentity(await loadQuartzLayout()))
// The YAML loader creates its dispatcher before project-level layout overrides.
// Replace that instance so rendering and resource collection use the same layout.
config.plugins.emitters = config.plugins.emitters.map((emitter) =>
  emitter.name === "PageTypeDispatcher" ? PageTypeDispatcher(layout) : emitter,
)
export default config
