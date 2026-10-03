# Sol panel

Masaüstünde Ayarlar'ın yanındaki düğme paneli daraltır. Daraltıldığında mevcut
arama, tema, okuma modu, Ayarlar ve panel düğmesi soldaki 56 px şeritte alt alta
kalır. Şerit sayfa boyunca uzanır ve içerikten bir çizgiyle ayrılır. İçerik kalan alanı kullanır;
Dar/Geniş/Tam okuma ayarı korunur. Mobil Explorer değiştirilmez.

Tercih ilk çizim öncesinde okunur, `localStorage` ile sayfa geçişleri ve yenilemede
korunur. Depolama kapalıysa düğme yine çalışır. Gizlenen Raflar ve başlık klavye odağı alamaz;
şeritteki araçlar klavyeyle erişilebilir kalır.
Panel kapanınca Raflar'ın açık sütunları kapanır; sabitlenmiş okuma pencereleri kalır.
Ctrl/Cmd+K paneli genişletmeden Quartz'ın mevcut genel aramasını çalıştırır.

Entegrasyon: `withSidebarToggle` yerel layout bileşeni ve `custom.scss` stil importu.
Core veya paket dosyası değiştirilmez.

Tarayıcıda kontrol: paneli kapat/aç; uzun bir sayfada gezin; SPA geçişi ve yenile;
Ctrl+K kullan; Tab ile kapalı panele girilemediğini kontrol et. Açık Raflar
sütunları, okuma modu, 800/1200 px sınırları, %200 yakınlaştırma ve mobil görünümü dene.
