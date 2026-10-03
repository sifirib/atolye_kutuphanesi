# Sol panel

Masaüstünde Ayarlar'ın yanındaki düğme paneli kapatır. Panel kapalıyken aynı düğme
sol üstte görünür ve paneli geri açar. İçerik kalan alanı kullanır;
Dar/Geniş/Tam okuma ayarı korunur. Mobil Explorer değiştirilmez.

Tercih ilk çizim öncesinde okunur, `localStorage` ile sayfa geçişleri ve yenilemede
korunur. Depolama kapalıysa düğme yine çalışır. Gizli panel klavye odağı alamaz.
Panel kapanınca Raflar'ın açık sütunları kapanır; sabitlenmiş okuma pencereleri kalır.
Ctrl/Cmd+K paneli geri açar ve Quartz'ın mevcut genel aramasını çalıştırır.

Entegrasyon: `withSidebarToggle` yerel layout bileşeni ve `custom.scss` stil importu.
Core veya paket dosyası değiştirilmez.

Tarayıcıda kontrol: paneli kapat/aç; uzun bir sayfada gezin; SPA geçişi ve yenile;
Ctrl+K kullan; Tab ile kapalı panele girilemediğini kontrol et. Açık Raflar
sütunları, okuma modu, 800/1200 px sınırları, %200 yakınlaştırma ve mobil görünümü dene.
