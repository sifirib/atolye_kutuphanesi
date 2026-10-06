import { applyPreferences, defaults, fonts, readPreferences, sizes, storageKey, validate, type Preferences } from "./preferences"

let value = readPreferences()
let opener: HTMLButtonElement | null = null
const dialog = document.createElement("dialog")
dialog.className = "reading-settings"
dialog.setAttribute("aria-labelledby", "reading-settings-title")
dialog.innerHTML = `<form method="dialog"><header><h2 id="reading-settings-title">Ayarlar</h2><button aria-label="Ayarları kapat" value="close">×</button></header>
<label>Yazı tipi<select name="font">${fonts.map((font) => `<option>${font}</option>`).join("")}</select></label>
<label>Yazı boyutu<select name="size">${sizes.map((size) => `<option value="${size}">${size} px</option>`).join("")}</select></label>
<label class="reading-settings-desktop">Okuma genişliği<select name="width"><option value="narrow">Dar</option><option value="wide">Geniş</option><option value="full">Tam</option></select></label>
<label>Renk paleti<select name="palette"><option value="atolye">Atölye</option><option value="ttrpg">TTRPG</option><option value="green">Yeşil</option></select></label>
<p>Açık ve koyu görünüm, tema düğmesinden değiştirilir.</p>
<label class="reading-settings-check reading-settings-desktop"><input type="checkbox" name="ticker">Günün ayeti barını göster</label>
<button type="button" data-reset>Varsayılana dön</button><p role="status"></p></form>`
document.body.append(dialog)
const tickerCheckbox = dialog.querySelector<HTMLInputElement>('[name="ticker"]')!
function sync() {
  dialog.querySelectorAll<HTMLSelectElement>("select").forEach((select) => { select.value = String(value[select.name as keyof Preferences]) })
  tickerCheckbox.checked = value.ticker
}
function save() {
  applyPreferences(value)
  const status = dialog.querySelector<HTMLElement>('[role="status"]')!
  try { localStorage.setItem(storageKey, JSON.stringify(value)); status.textContent = "" }
  catch { status.textContent = "Tercihler bu oturumda geçerli; tarayıcı kalıcı kayda izin vermiyor." }
}
dialog.addEventListener("change", () => {
  const fields = Object.fromEntries(new FormData(dialog.querySelector("form")!).entries())
  value = validate({ ...fields, size: Number(fields.size), ticker: tickerCheckbox.checked }); save()
})
dialog.querySelector("[data-reset]")!.addEventListener("click", () => { value = { ...defaults }; sync(); save() })
dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close() })
dialog.addEventListener("close", () => opener?.isConnected && opener.focus())
document.addEventListener("click", (event) => {
  const button = (event.target as Element).closest<HTMLButtonElement>(".reading-settings-open")
  if (!button) return
  opener = button; sync(); dialog.showModal()
})
document.addEventListener("prenav", () => { opener = null; if (dialog.open) dialog.close() })
document.addEventListener("nav", () => { document.body.append(dialog); applyPreferences(value) })
window.addEventListener("storage", (event) => { if (event.key === storageKey) { value = readPreferences(); applyPreferences(value); sync() } })
