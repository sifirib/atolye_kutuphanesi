# Okuma pencereleri

Masaüstünde Raflar dosyaları ve içerik bağlantıları aynı sağlayıcıyı kullanır.
`enablePopovers: false` olduğunda yüklenmez. Dokunmatik kullanımda Quartz'ın
mevcut davranışı korunur; yeni pencere kontrolleri eklenmez.

- 250 ms bekleme veya bağlantı odaktayken Space: önizleme.
- Tıklama/Enter: sayfayı açma. Başlık bağlantısı da kaynak sayfayı açar.
- Başlığı sürükleme veya kenarlardan boyutlandırma: otomatik sabitleme.
- Raptiye: sabitleme; ızgara: kenar/köşe/tam ekran yerleşimi ve geri alma.
- Eksi: alta küçültme; alttaki başlık: geri açma.
- Escape: önce yerleşim menüsünü, ardından odaktaki/geçici pencereyi kapatma.

Sabitlenen pencereler SPA geçişlerinde ve aynı sekmede yenilemede korunur.
Konum, boyut, küçültülme ve okuma konumu `sessionStorage` içinde tutulur.
Geçici önizlemeler kaydedilmez. Küçültülmüş kayıtların içeriği geri açılana
kadar yüklenmez. Depolama engellenirse pencereler bellekte çalışmayı sürdürür.
Okuma modunda alt şerit gizlenir. Şerit görünürken sayfa gezinme düğmeleri
şeridin gerçek yüksekliği kadar yukarı taşınır.
Tek geçici pencere bulunur. Tamamlanmış son altı sayfa bellekte tutulur;
toplu ön yükleme yapılmaz. Kapatılan pencerelerin istekleri iptal edilir.
Yerleşim hesabı, içerik yükleme ve pencere olayları ayrı dosyalardadır.
PDF/ses/video bağlantıları mevcut Quartz sağlayıcısına bırakılır.

## Doğrulama

```powershell
npx tsc --noEmit
npx tsx --test quartz/plugins/custom/reading-windows/geometry.test.ts quartz/plugins/custom/reading-windows/session.test.ts
npx quartz build --serve
```

Tarayıcı kontrolü:

1. Raflar ve içerikten hızlıca birkaç bağlantı üzerinden geçin; yalnızca son
   bağlantı açılmalı. Yavaş ağda kapanan pencere tekrar görünmemeli.
2. Hadis ve Kur'an-ı Kerim pencerelerini sabitleyin. Raflar'ı kapatın ve başka
   sayfaya gidin; pencereler ve kendi kaydırma konumları korunmalı.
3. Önizlemedeki başka bir bağlantıyı önizleyin; ana pencere kapanmamalı.
4. Başlığı sürükleyin; sürüklemeyi bırakmak sayfaya gitmemeli. Başlığa normal
   tıklama ise gitmeli. Kenarlardan/köşelerden boyutlandırmayı deneyin.
5. Dokuz yerleşimi, geri almayı, küçültüp geri açmayı ve daraltılmış tarayıcıyı
   deneyin. Hiçbir pencerenin kapatma düğmesi ekran dışında kalmamalı.
6. Tab, Space, Enter ve Escape ile ilerleyin. Yerleşim menüsündeki bütün
   seçeneklere klavyeyle erişilebilmeli; kapatınca odak kaybolmamalı.
7. Arapça/meal düğmelerini ve önizlemeden kaynaklı kopyalamayı deneyin.
8. Açık/koyu paletleri, %200 yakınlaştırmayı ve mobil Explorer'ı kontrol edin.

9. Bir pencereyi küçültüp sayfayı yenileyin; kayıt geri gelmeli. Kapatıp tekrar
   yenileyince geri gelmemeli. Geçici önizlemeler geri yüklenmemeli.
10. Okuma modunda şerit gizlenmeli; moddan çıkınca geri gelmeli. Başlangıca/sona
    götüren düğmeler alt şeritle çakışmamalı; şerit boşalınca aşağı dönmeli.
