# Ipekyol Range Sayaç - PLM Integration

Node.js projesi ile Infor PLM/ION API entegrasyonu.

## Özellikler

- ✅ OAuth2.0 token yönetimi
- ✅ Otomatik token cache'leme
- ✅ Token yenileme mekanizması
- ✅ Aynı tenant ve credentials ile PLM'e bağlanma

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

### Token İşlemleri

#### Token Al
```bash
GET /api/token
```
Geçerli bir access token döner (cache'den veya yeni).

#### Token Bilgisi
```bash
GET /api/token/info
```
Token durumu ve bilgilerini döner (token'ı göstermeden).

#### Token Yenile
```bash
POST /api/token/refresh
```
Mevcut token'ı iptal edip yeni token alır.

#### Token İptal Et
```bash
POST /api/token/revoke
```
Mevcut token'ı iptal eder.

## Konfigürasyon

PLM bağlantı ayarları `src/config/plm.config.js` dosyasında:

- **Tenant ID**: ATJZAMEWEF5P4SNV_TST
- **ION API URL**: https://mingle-ionapi.eu1.inforcloudsuite.com
- **Provider URL**: https://mingle-sso.eu1.inforcloudsuite.com:443/ATJZAMEWEF5P4SNV_TST/as/

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

