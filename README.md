# Ipekyol Range Sayaç - PLM Integration

Node.js projesi ile Infor PLM/ION API entegrasyonu. Range (koleksiyon) tamamlanma oranlarını izlemek için POC uygulaması.

## Özellikler

- ✅ OAuth2.0 token yönetimi (Test & Production ortamları)
- ✅ Otomatik token cache'leme
- ✅ Token yenileme mekanizması
- ✅ PLM'den gerçek zamanlı kategori ve tema bazlı range hesaplaması
- ✅ Excel bazlı statik veri API'leri
- ✅ Swagger/OpenAPI dokümantasyonu
- ✅ Geçmiş sezon verisi simülasyonu

## Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Sunucuyu başlat
npm start

# Geliştirme modu (nodemon ile)
npm run dev
```

## API Endpoints

Tüm endpoint'lerin detaylı dökümantasyonu için: **[/api-docs](https://rangecount-652fcc1f20d9.herokuapp.com/api-docs)**

### 📊 Range API'leri

#### Statik Kategori Verileri (Excel)
```bash
GET /api/ranges
GET /api/ranges/summary
GET /api/ranges/lifestyle/:group
GET /api/ranges/product/:group
```

#### Statik Detay Verileri (Excel)
```bash
GET /api/range-details
GET /api/range-details/summary/fabric
GET /api/range-details/lifestyle/:group
```

#### Dinamik PLM Kategori Verileri
```bash
GET /api/plm-ranges          # RangeSayacv2.xlsx → PLM eşleştirme
GET /api/plm-ranges/summary
```

#### Dinamik PLM Tema Verileri
```bash
GET /api/plm-themes          # RangeSayacv3.xlsx → PLM eşleştirme
GET /api/plm-themes/summary  # SezonOrtalaması ve Referans kayıtları hariç
```

#### Banner Özet Metrikleri
```bash
GET /api/banner              # Kategori + Tema özeti
```

#### Geçmiş Sezon Verileri
```bash
GET /api/past-season-data    # Random, gerçekçi geçmiş sezon metrikleri
```

### 🔐 Token İşlemleri

```bash
GET  /api/token              # Token al
GET  /api/token/info         # Token durumu
POST /api/token/refresh      # Token yenile
POST /api/token/revoke       # Token iptal et
```

## 🔧 Konfigürasyon

PLM bağlantı ayarları `src/config/plm.config.js` dosyasında:

### Test Ortamı (Varsayılan)
- **Tenant ID**: ATJZAMEWEF5P4SNV_TST
- **Season ID**: 1
- **ION API URL**: https://mingle-ionapi.eu1.inforcloudsuite.com

### Production Ortamı
- **Tenant ID**: ATJZAMEWEF5P4SNV_PRD
- **Season ID**: 1
- **ION API URL**: https://mingle-ionapi.eu1.inforcloudsuite.com

**Production'a geçmek için:**
```bash
# Heroku'da
heroku config:set NODE_ENV=production --app rangecount-652fcc1f20d9
```

Detaylı deployment bilgisi için: **[DEPLOYMENT.md](./DEPLOYMENT.md)**

## Token Servisi Kullanımı

```javascript
const tokenService = require('./services/tokenService');

// Token al
const token = await tokenService.getAccessToken();

// Authorization header al
const authHeader = await tokenService.getAuthorizationHeader();

// Token bilgisi
const info = tokenService.getTokenInfo();
```

## Teknolojiler

- Node.js >= 18.0.0
- Express.js
- Axios
- OAuth2.0

## Lisans

ISC

