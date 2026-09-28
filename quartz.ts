import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { Quran } from "./quartz/plugins/custom/quran"

const config = await loadQuartzConfig()
config.plugins.transformers.push(Quran())
export default config
export const layout = await loadQuartzLayout()
