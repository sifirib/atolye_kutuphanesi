# v4 özellikleri: yerel doğrulama

Bu değişikliklerde build, test ve tarayıcı kontrolleri çalıştırılmadı.
Commitler uygulama kodunu kaydeder; çalışma zamanı doğrulaması aşağıdaki adımlarla yapılmalı.

```powershell
npx tsc --noEmit
npx tsx --test quartz/plugins/custom/source-copy/format.test.ts quartz/plugins/custom/reading-settings/preferences.test.ts quartz/plugins/custom/site-identity/sort.test.ts
npx quartz build --serve
```

- Ayet düğmesi: Orijinal/Meal/ikisi açık durumlarında yalnızca görünen metni, sure/ayet bilgisini, meal kaynağını ve bağlantıyı kontrol et.
- Seçili metin: kısmi kalın/italik, birden çok ayet, iç içe listeler, hadis paragrafları; normal Ctrl+C değişmemeli.
- Raflar önizlemesinden kopyalanan bağlantı önizlenen sayfayı açmalı. Pano izni reddedilince başarı bildirimi çıkmamalı.
- Telegram düğmesi normal sohbet için HTML ve düz metin panosu üretir. Telegram Desktop ve mobilde kalın/italik/satır sonlarını ayrıca dene; istemcinin biçimleri koruduğu henüz doğrulanmadı.
- Ayarlar: dört boyut ve font, üç genişlik, üç paletin açık/koyu halleri; yenileme ve SPA geçişleri, Escape, Tab ve odağın açan düğmeye dönüşü.
- Eski `settingsMenu` değerleri yeni tercih kaydı yoksa bir kez aktarılır. Bozuk veya engellenmiş localStorage ile sayfa çalışmalı.
- Dar masaüstü, mobil ve %200 yakınlaştırmada metin/araçlar taşmamalı. Mobil Explorer varsayılan kalmalı.
- Raflar arama, sabitlenenler, sure sırası, satır içi ayete gitme ve 250 ms önizleme gecikmesi regresyon kontrolünden geçirilmeli.
- Klasör/etiket sayfalarında klasörler önce, dosya 2 dosya 10'dan önce gelmeli; liste tarihi görünmemeli, içerik tarihi kalmalı.

Değişiklikler yerel modüller, proje ayarları ve site ikonu ile sınırlıdır.
Markdown ve ayet block ID'leri değiştirilmedi. Otomatik OG üretimi kapalıdır.
