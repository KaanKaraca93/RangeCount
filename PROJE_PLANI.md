# Ipekyol Range Sayaç — 2. Faz Geliştirme Proje Planı

> **Oluşturulma:** 3 Nisan 2026  
> **Amaç:** Mevcut Excel bazlı sistemi DB bazlı, kullanıcı yönetilebilir bir platforma taşımak

---

## Bağlam & Mevcut Durum

### Şu an nasıl çalışıyor?
- Plan hedefleri Heroku sunucusuna gömülü **Excel dosyaları** üzerinden okunuyor
- Güncelleme = Excel'i değiştir + Heroku'ya deploy et
- Tüm PLM ID'leri (BrandId, SubSubCategoryId, ExtFldId, DropDownValue...) Excel'e elle girilmiş
- Planlama ekibinin bu ID'lere erişimi yok, değiştiremez

### Hedef mimari
```
Planlama Ekibi
    ↓ (Excel yükler — Name bazlı, ID bilmeden)
Ming.le Widget / Admin Endpoint
    ↓ (Name → PLM ID çözümlemesi)
Heroku Postgres (versiyonlu planlar)
    ↓
Mevcut API'ler (plm-ranges, plm-themes, range-v5 vb.)
    ↓
PLM'den gerçekleşen veri (değişmiyor)
```

---

## Plan Versiyonlama Modeli (Kararlaştırıldı)

### Snapshot yaklaşımı
- Her plan yüklemesi = tam bir snapshot (tüm satırlar)
- Sadece bir versiyon "aktif" olur
- Diğerleri arşivde durur, geri alınabilir
- Satır seviyesinde diff/audit yok — karmaşıklık gereksiz

### DB Yapısı (özet)
```
plan_versiyonlari
├── id, faz, versiyon_adi
├── plan_tipi ('butce' | 'range')
├── durum ('taslak' | 'aktif' | 'arsiv')
├── yukleme_tarihi, yukleyen

butce_hedefleri
├── versiyon_id (FK)
├── marka, lifecycle_grup, urun_alt_grup
└── p_opt

range_hedefleri
├── versiyon_id (FK)
├── marka, urun_grubu, range_tag
├── ext_fld_adi, dropdown_degeri (name olarak saklanır)
├── ext_fld_id, dropdown_value_id (PLM ID olarak da saklanır)
└── option_say
```

### Sorgular
```sql
-- Aktif plan
SELECT * FROM butce_hedefleri bh
JOIN plan_versiyonlari pv ON bh.versiyon_id = pv.id
WHERE pv.durum = 'aktif' AND pv.plan_tipi = 'butce';

-- Versiyona geri dön (2 satır)
UPDATE plan_versiyonlari SET durum = 'arsiv' WHERE durum = 'aktif' AND plan_tipi = 'butce';
UPDATE plan_versiyonlari SET durum = 'aktif' WHERE id = 5;
```

---

## Widget Yönetim Kararları (Kararlaştırıldı)

| İşlem | Nereden yönetilir | Gerekçe |
|---|---|---|
| Toplu plan yükleme | Excel Upload | Büyük yapısal değişim |
| Option Say güncelleme | Widget inline edit | Küçük dokunuş, güvenli |
| Yeni value ekleme | Excel Upload | PLM ID gerektirir |
| Range tag mapping değişimi | Excel Upload | Yapısal değişim |
| Versiyon geçmişi görme | Widget | Sadece okuma |
| Arşive geri dönme | Widget | 1 buton |

---

## Adımlar

---

### ✅ ADIM 0 — PLM Name→ID Çözümleme Testi (AZ RİSKLİ BAŞLANGIÇ)

**Amaç:** Kullanıcı PLM ID'lerini bilmeden Excel doldurasın. Upload anında Name → ID çevrimi yapılsın.

**Neden önce bu?**
Tüm sonraki adımların temeli. Bu çalışmazsa DB'ye doğru veri yazamayız.

#### Çözümlenmesi gereken Name→ID mapping'leri

| Kullanıcının girdiği | PLM Endpoint | Dönen ID |
|---|---|---|
| "IPEKYOL" (marka) | `GET /Brand?$filter=Name eq 'IPEKYOL'` | `BrandId: 4` |
| "GÖMLEK" (ürün grubu) | `GET /ProductSubSubCategory?$filter=Name eq 'GÖMLEK'` | `SubSubCategoryId: 221` |
| "Fashion Pyramid" (alan adı) | `GET /StyleExtendedFields?$filter=Name eq 'Fashion Pyramid'` | `ExtFldId: e8b38e...` |
| "Fashion Newness" (değer) | `GET /ExtendedFieldDropDown?$filter=Name eq 'Fashion Newness'` | `DropDownValue: 9` |
| "FT1" (CUD5) | PLM dropdown lookup | `CUD5Id: 15` |
| "Mono" (lifestyle grup) | PLM ColorwayUserField4 dropdown | `LifeStyleGrup_Id: 3` |

#### Bu adımda yapılacaklar
1. Her PLM endpoint'i test et — çalışıyor mu, response yapısı ne?
2. Hangi field isimleri PLM'de tam eşleşiyor, hangilerinde sorun var?
3. Çözümleme başarısız olursa hangi hata mesajı dönsün?
4. Cache stratejisi: Lookup'lar her upload'da PLM'e mi gidecek, yoksa DB'de mi cache'lenecek?

#### Yeni Excel formatı (kullanıcının dolduracağı)

**Bütçe Planı:**
```
Marka   | LifeStyle Grup | Ürün Alt Grup | P_Opt
IPEKYOL | Mono           | GÖMLEK        | 56
IPEKYOL | Business       | PANTOLON      | 42
```

**Range Planı:**
```
Marka   | Ürün Grubu | Range Tag | Alan Adı        | Değer           | CUD5 | Option Say
IPEKYOL | GÖMLEK     | Range1    | Fashion Pyramid | Fashion Newness | FT1  | 5
IPEKYOL | GÖMLEK     | Range1    | Fashion Pyramid | Fashion Core    | FT1  | 3
IPEKYOL | TİŞÖRT     | Range1    | Kol Boyu        | Kısa Kollu      |      | 8
```

---

### ADIM 1 — Heroku Postgres Kurulumu

**Kullanıcının yapacağı (manuel, tek seferlik):**
1. Heroku Dashboard → `rangecount-652fcc1f20d9` uygulaması
2. Resources → Add-ons → "Heroku Postgres" ara → seç
3. Plan: `Essential-0` (aylık ~5$) veya `Mini` (ücretsiz, 10K satır sınırı)
4. Provision → `DATABASE_URL` environment variable otomatik eklenir

**Cursor'dan yapılacak (kod):**
- Uygulama başladığında `DATABASE_URL` varsa DB'ye bağlan
- Migration: Tablolar yoksa oluştur (otomatik, git push sonrası çalışır)
- Heroku CLI gerekmez, her şey uygulama kodu içinde

---

### ADIM 2 — DB Tabloları & Migration Sistemi

**Cursor'dan yapılacak:**

```
src/
├── config/
│   ├── plm.config.js (mevcut)
│   └── db.config.js (yeni — Postgres bağlantısı)
├── db/
│   ├── migrate.js (startup migration)
│   └── schema.sql (tablo tanımları)
└── ...
```

**Tablolar:**
- `plan_versiyonlari` — her yükleme bir kayıt
- `butce_hedefleri` — bütçe plan satırları
- `range_hedefleri` — range plan satırları
- `plm_lookup_cache` — name→ID çözümleme cache

**Migration nasıl çalışır:**
```javascript
// src/index.js içinde
app.listen(PORT, async () => {
  await migrate(); // Tablolar yoksa oluştur
  console.log('✅ DB migration tamamlandı');
});
```

Git push → Heroku restart → migrate() çalışır → tablolar hazır.

---

### ADIM 3 — Upload & Versiyon Yönetimi API

**Yeni endpoint'ler:**

```
POST /api/admin/plan/upload
  Body: multipart/form-data (Excel dosyası + plan_tipi + faz + versiyon_adi)
  İşlem:
    1. Excel parse
    2. Her satır için name→ID çözümlemesi (PLM lookup)
    3. Validasyon — bulunamayanları hata olarak dön
    4. Başarılıysa DB'ye yaz (durum: 'taslak')

POST /api/admin/plan/:id/activate
  İşlem: Eski aktifi arşivle, bunu aktif yap

GET  /api/admin/plan/versions?plan_tipi=butce
  İşlem: Tüm versiyonları listele (aktif, arşiv, taslak)

POST /api/admin/plan/:id/rollback
  İşlem: Bu versiyonu tekrar aktif yap
```

---

### ADIM 4 — Mevcut API'leri DB'ye Taşı

**Değişecek servisler:**

| Mevcut | Excel Dosyası | DB Tablosu |
|---|---|---|
| plmRangeService | RangeSayacv2.xlsx | butce_hedefleri |
| plmThemeService | RangeSayacv3.xlsx | butce_hedefleri |
| rangeCountSourceService | RangeSayacv4.xlsx | butce_hedefleri |
| plmRangeV5Service | Rangesayacv5.xlsx | range_hedefleri |
| plmDClusterService | Dcluster.xlsx | butce_hedefleri |

**Strateji:** Önce DB'den oku, yoksa Excel'den fallback (geçiş dönemi güvenliği).

---

### ADIM 5 — 2. Faz Geçişi (Excel Upload ile)

**Upload endpoint hazır olduktan sonra:**
1. 2. faz hedef Excel'ini yeni formatta hazırla (name bazlı)
2. Upload endpoint'e gönder
3. Validasyon geçerse "taslak" olarak kaydedilir
4. Kontrol → "Aktif Yap"

Excel formatını bildiğimiz için bu adım kısa sürer.

---

### ADIM 6 — Ming.le Widget'ları

**Widget 1: Plan Upload**
- Tipi: External (iframe) — `fetch()` serbestçe kullanılabilir
- Drag & drop Excel yükleme
- Satır önizlemesi ("53 satır, 1094 P_Opt")
- Validasyon hataları göster ("'Fashon Newness' PLM'de bulunamadı")
- "Aktif Yap" butonu

**Widget 2: Versiyon Geçmişi**
- Tüm versiyonları listele (tarih, kim yükledi, kaç satır)
- "Geri Yükle" butonu
- Aktif plan vurgulanmış

**Widget 3: Range Plan Inline Edit** *(sonraki faz)*
- Aktif range planını tablo olarak göster
- Option Say için inline edit
- Değişiklik → otomatik yeni snapshot

---

## Önemli Teknik Notlar

### Heroku CLI Olmadan DB Yönetimi
CLI gerekmez. Her şey git push ile çözülür:
- Tablolar: Startup migration
- Veri: Upload endpoint'ten
- Schema değişikliği: Migration script'e ekle → push → otomatik

### PLM Lookup Cache
PLM'e her upload'da istek atmak yavaşlatır. Çözüm:
- `plm_lookup_cache` tablosunda name→ID sakla
- Cache TTL: 24 saat (veya "Lookupları Yenile" butonu)
- PLM değişirse cache invalidate et

### Fallback (Geçiş Dönemi)
DB boşken API çökmemeli:
```javascript
const data = await db.getAktifPlan() || excel.readFallback();
```
Eski Excel dosyaları silinmez, ta ki DB'de veri olana kadar.

### Güvenlik (Admin Endpoint'leri)
Upload ve aktivasyon endpoint'leri şu an açık. İleride:
- Basit API key (header'da)
- Veya Ming.le widget'tan gelen user bilgisi ile kontrol

---

## Mevcut API'ler — Değişmeyecekler

Aşağıdaki endpoint'ler PLM'den canlı veri çekiyor, plan verisi kullanmıyor. Bunlara dokunulmaz:

- `GET /api/style-costing` — PLM'den direkt maliyet verisi
- `GET /api/plm-style/:styleId` — PLM'den tekil style
- `GET /api/past-season-data` — Random POC (zaten geçici)
- `GET /api/token*` — Token yönetimi
- `GET /api/banner` — plm-ranges + plm-themes bileşiği (onlar değişince bu da değişir)

---

## Excel Dosyaları — Mevcut Durum

| Dosya | Kullanılan Servis | Sonraki Durum |
|---|---|---|
| RangeSayac.xlsx | rangeDataService (statik, random data) | Kalıcı olarak kaldırılabilir |
| RangeDetay.xlsx | rangeDetailService (statik) | Kalıcı olarak kaldırılabilir |
| RangeSayacv2.xlsx | plmRangeService | DB'ye geçince silinir |
| RangeSayacv3.xlsx | plmThemeService | DB'ye geçince silinir |
| RangeSayacv4.xlsx | rangeCountSourceService | DB'ye geçince silinir |
| Rangesayacv5.xlsx | plmRangeV5Service | DB'ye geçince silinir |
| Dcluster.xlsx | plmDClusterService | DB'ye geçince silinir |

---

## Deployment Akışı (Mevcut, Değişmiyor)

```
Cursor'da kod değişikliği
    ↓
git add . && git commit -m "..."
    ↓
git push heroku main  (kullanıcı yapar)
    ↓
Heroku otomatik restart
    ↓
Startup migration çalışır (tablolar yoksa oluşturur)
    ↓
Yeni kod canlıda
```

---

## Sıra & Öncelik

```
[YAPILACAK]  0. PLM Name→ID resolution testi      ← Sonraki oturum başlangıcı
[YAPILACAK]  1. Heroku Postgres subscription        ← Kullanıcı (web dashboard, 5 dk)
[YAPILACAK]  2. DB tabloları & migration sistemi
[YAPILACAK]  3. Upload & versiyon yönetimi API
[YAPILACAK]  4. Mevcut API'leri DB'ye taşı
[YAPILACAK]  5. 2. faz geçişi (Excel upload)
[SONRA]      6. Ming.le widget'ları
[SONRA]      7. Range plan inline edit widget
```

---

*Son güncelleme: 3 Nisan 2026*
