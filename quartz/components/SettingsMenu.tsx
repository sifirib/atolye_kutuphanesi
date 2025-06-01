import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import settingsMenuStyle from "./styles/settingsMenu.scss"

// @ts-ignore
import script from "./scripts/settingsmenu.inline"


interface Options {
    favouriteNumber: number
}

const defaultOptions: Options = {
    favouriteNumber: 42,
}

export default ((userOpts?: Options) => {
    const opts = { ...userOpts, ...defaultOptions }
    function SettingsMenu(props: QuartzComponentProps) {
        if (opts.favouriteNumber < 0) {
            return null
        }

        return (
            <>
            {/* Added aria attributes for accessibility */}
            <button class="setting-btn" id="settings-button" aria-expanded="false" aria-controls="settings-menu">
                <span class="bar bar1"></span>
                <span class="bar bar2"></span>
                <span class="bar bar1"></span>
            </button>

            <div class="settings-menu" id="settings-menu" role="dialog" aria-label="Site ayarları">
                <div class="radio-toolbar">
                    <h6>Yazı Boyutu</h6>
                    <div class="radio-group">
                        <input type="radio" id="radioFontSize1" name="radioFontSize" value="15px" checked/>
                        <label for="radioFontSize1">Küçük</label>

                        <input type="radio" id="radioFontSize2" name="radioFontSize" value="17px"/>
                        <label for="radioFontSize2">Orta</label>

                        <input type="radio" id="radioFontSize3" name="radioFontSize" value="19px"/>
                        <label for="radioFontSize3">Büyük</label>

                        <input type="radio" id="radioFontSize4" name="radioFontSize" value="24px"/>
                        <label for="radioFontSize4">Aşırı Büyük</label> 
                    </div>

                    <h6>Yazı Tipi</h6>
                    <div class="radio-group">
                        <input type="radio" id="radioFont1" name="radioFont" value="Tahoma"/>
                        <label for="radioFont1">Tahoma</label>

                        <input type="radio" id="radioFont2" name="radioFont" value="Source Sans Pro"/>
                        <label for="radioFont2">Source Sans Pro</label>

                        <input type="radio" id="radioFont3" name="radioFont" value="Times New Roman"/>
                        <label for="radioFont3">Times New Roman</label>

                        <input type="radio" id="radioFont4" name="radioFont" value="Atkinson Hyperlegible Next" checked/>
                        <label for="radioFont4">Zayıf Görüş (Aşırı Okunaklı) Modu</label>
                    </div>

                    <h6>Genişlik</h6>
                    <div class="radio-group">
                        <input type="radio" id="radioWidth1" name="radioWidth" value="60"/>
                        <label for="radioWidth1">Dar</label>

                        <input type="radio" id="radioWidth2" name="radioWidth" value="78"/>
                        <label for="radioWidth2">Geniş</label>

                        <input type="radio" id="radioWidth3" name="radioWidth" value="100" checked/>
                        <label for="radioWidth3">Tam Ekran</label> 
                    </div>
                </div>
            </div>
            </>
        )
    }

    SettingsMenu.css = settingsMenuStyle
    SettingsMenu.afterDOMLoaded = script
    return SettingsMenu
}) satisfies QuartzComponentConstructor