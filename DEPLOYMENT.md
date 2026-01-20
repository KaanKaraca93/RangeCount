# 🚀 Deployment Guide

## Environment Configuration

Bu proje **TEST** ve **PRODUCTION** ortamlarını desteklemektedir.

### 🧪 Test Ortamı (Varsayılan)

Varsayılan olarak test ortamı kullanılır. Hiçbir environment variable ayarlanmadığında:
- Tenant: `ATJZAMEWEF5P4SNV_TST`
- Season ID: `1`

### 🔴 Production Ortamı

Production ortamına geçmek için:

#### **Yöntem 1: Environment Variable ile**

Heroku'da veya deployment platformunda aşağıdaki environment variable'ı ayarlayın:

```bash
NODE_ENV=production
```

Bu durumda otomatik olarak production credentials kullanılır:
- Tenant: `ATJZAMEWEF5P4SNV_PRD`
- Season ID: `1`

#### **Yöntem 2: Manuel Override (Opsiyonel)**

Tüm parametreleri manuel olarak override etmek isterseniz:

```bash
NODE_ENV=production
PLM_TENANT_ID=ATJZAMEWEF5P4SNV_PRD
PLM_CLIENT_NAME=BackendServisi
PLM_CLIENT_ID=ATJZAMEWEF5P4SNV_PRD~zWbsEgkMBlqdSXoSAXBiM8V1POA0-2Mkn1qkORhxma0
PLM_CLIENT_SECRET=Ll2ehfOJ14uXzyLwR-6BIUmnQNFfhSFRadOzhfzIgK8DBs0x8_AQ3vqbiNrCVOfTyN3_v_Vyf1Yq4WMA7F68hg
PLM_SERVICE_ACCOUNT_ACCESS_KEY=ATJZAMEWEF5P4SNV_PRD#fAzHs-Kdtut0xOXsRx1rnc4kB9icdTJ25HPE65-3-Q0G477cLbXRgPOsL0JjhQCA2VlgbJvK400_9ZaezhMKIQ
PLM_SERVICE_ACCOUNT_SECRET_KEY=Bd7aqwQd7K8Xw8uMLffxlNrM8oROajrY18EVpPalakqECxXs5HzFzZoT45JBKtUGZvfacr8bCrgCmgscu71rTA
PLM_SEASON_ID=1
```

---

## 📦 Heroku Deployment

### 1️⃣ Test Ortamı Deploy (Mevcut)

Heroku'daki mevcut app test ortamını kullanır. Hiçbir değişiklik gerekmez:

```bash
git push heroku main
```

### 2️⃣ Production Ortamı Deploy

#### **Seçenek A: Aynı Heroku App'te Environment Variable Değiştir**

```bash
heroku config:set NODE_ENV=production --app rangecount-652fcc1f20d9
```

Bu komut sonrası app otomatik olarak restart olacak ve **PRODUCTION** ortamına bağlanacak.

#### **Seçenek B: Yeni Heroku App Oluştur (Önerilen)**

Production için ayrı bir app oluşturmak daha güvenli:

```bash
# Yeni Heroku app oluştur
heroku create rangecount-production

# Production remote ekle
git remote add heroku-prod https://git.heroku.com/rangecount-production.git

# Environment variable ayarla
heroku config:set NODE_ENV=production --app rangecount-production

# Deploy et
git push heroku-prod main
```

---

## 🔍 Environment Doğrulama

Uygulamanın hangi ortamda çalıştığını kontrol etmek için sunucu loglarına bakın:

```bash
# Heroku logs
heroku logs --tail --app rangecount-652fcc1f20d9
```

Göreceğiniz log:
- Test: `🔧 PLM Config loaded for: TEST (ATJZAMEWEF5P4SNV_TST)`
- Production: `🔧 PLM Config loaded for: PRODUCTION (ATJZAMEWEF5P4SNV_PRD)`

---

## ⚙️ Mevcut Konfigürasyon

| Parametre | Test (TST) | Production (PRD) |
|-----------|------------|------------------|
| **Tenant ID** | ATJZAMEWEF5P4SNV_TST | ATJZAMEWEF5P4SNV_PRD |
| **Client Name** | BackendServisi | BackendServisi |
| **Season ID** | 1 | 1 |
| **ION API URL** | https://mingle-ionapi.eu1.inforcloudsuite.com | https://mingle-ionapi.eu1.inforcloudsuite.com |
| **SSO URL** | mingle-sso.eu1.inforcloudsuite.com:443 | mingle-sso.eu1.inforcloudsuite.com:443 |

---

## 🔐 Güvenlik Notları

- ✅ Credentials `src/config/plm.config.js` içinde hardcoded olarak bulunur
- ✅ Bu dosya `.gitignore` ile ignore edilmez (çünkü Heroku'da kullanılması gerekiyor)
- ⚠️ Public repo'larda bu dosyayı paylaşmayın!
- 💡 İleride `.env` dosyası kullanmak isterseniz `dotenv` package'ı eklenebilir

---

## 📊 API Endpoint'leri

Tüm endpoint'ler hem TEST hem PRODUCTION ortamlarında aynı şekilde çalışır:

- `/api/ranges` - Statik kategori verileri (Excel'den)
- `/api/range-details` - Statik detay verileri (Excel'den)
- `/api/plm-ranges` - Dinamik kategori verileri (PLM'den)
- `/api/plm-themes` - Dinamik tema verileri (PLM'den)
- `/api/banner` - Özet metrikler
- `/api/past-season-data` - Geçmiş sezon verileri (random)
- `/api-docs` - Swagger documentation

---

## ✅ Deployment Checklist

- [ ] Test ortamında API'ler çalışıyor mu? → Test edin
- [ ] Heroku'da `NODE_ENV=production` ayarlandı mı?
- [ ] Logs'da production tenant görünüyor mu? → `heroku logs --tail`
- [ ] Production PLM'den veri çekiliyor mu? → `/api/plm-ranges` test edin
- [ ] Swagger documentation güncel mi? → `/api-docs` kontrol edin

---

**🎯 Hazırsınız! Artık production ortamına deploy edebilirsiniz.**
