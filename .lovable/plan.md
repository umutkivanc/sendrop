

# Sendrop — Anonim Dosya Transfer Uygulaması

## Özet
Kullanıcıların kayıt olmadan, anahtar kelime ve şifre ile dosya paylaşabildiği güvenli bir dosya transfer uygulaması.

## Sayfa Yapısı

### 1. Ana Sayfa (/)
- Sendrop logosu ve kısa açıklama
- "Dosya Gönder" ve "Dosya Al" butonları
- Koyu tema, minimal tasarım

### 2. Dosya Gönder Sayfası (/send)
- Drag & drop destekli dosya yükleme alanı (max 100MB)
- Anahtar kelime input (3-10 karakter)
- Şifre input (3-10 karakter)
- Yükleme progress bar
- Başarılı yükleme sonrası özet ekranı (anahtar, şifre, süre, uyarı)

### 3. Dosya Al Sayfası (/receive)
- Anahtar kelime input
- Şifre input
- İndir butonu
- Hata mesajları (dosya bulunamadı, yanlış şifre, IP engeli süresi)

## Veritabanı (Supabase)

### files tablosu
- id, keyword (unique), password_hash, file_name, file_path, file_size, created_at, expires_at, is_downloaded

### ip_blocks tablosu
- id, ip_address, keyword, attempt_count, blocked_until

### Storage
- "files" bucket oluşturulacak

## Backend (Supabase Edge Functions)

### upload-file fonksiyonu
- Dosya boyutu kontrolü (max 100MB)
- Anahtar kelime benzersizlik kontrolü
- Şifreyi bcrypt ile hash'leyip kaydetme
- Dosyayı Supabase Storage'a yükleme

### download-file fonksiyonu
- IP engel kontrolü (kademeli bekleme: 15dk → 30dk → 1sa → ...)
- Anahtar kelime ile dosya bulma
- Şifre doğrulama
- Başarılıysa dosyayı indirme ve ardından silme (tek kullanımlık)
- Yanlış şifrede attempt_count artırma

### cleanup fonksiyonu
- Süresi dolan dosyaları (3 gün) veritabanı ve storage'dan silme
- Supabase pg_cron ile saatlik otomatik çalıştırma

## Tasarım
- Koyu tema: Arkaplan #0F0F0F, Kartlar #1A1A1A, Border #2A2A2A
- Ana renk: #6C63FF (mor)
- Yazılar: #FFFFFF / #A0A0A0
- Hata: #FF4D4D, Başarı: #4DFF91
- Tam responsive (mobil uyumlu)

## Güvenlik
- Şifreler bcrypt ile hash'lenir
- IP bazlı kademeli engelleme sistemi
- Dosyalar indirildikten sonra otomatik silinir
- RLS politikaları ile veritabanı güvenliği

