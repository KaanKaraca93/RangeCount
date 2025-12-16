# PLM Token Servisi - Kullanım Kılavuzu

## 🎯 Özellikler

Bu proje, Infor PLM/ION API'sine OAuth2.0 ile bağlanmak için gerekli token yönetim sistemini içerir:

- ✅ **Otomatik Token Yönetimi**: Token'lar otomatik olarak alınır ve cache'lenir
- ✅ **Token Geçerlilik Kontrolü**: Token süresi dolmadan 5 dakika önce yenilenir
- ✅ **Singleton Pattern**: Tüm uygulama tek bir token instance'ı kullanır
- ✅ **Aynı Tenant Bağlantısı**: Costing projesi ile aynı credentials kullanılır

## 📦 Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Sunucuyu başlat
npm start

# Geliştirme modu
npm run dev
```

## 🔐 Token Servisi Kullanımı

### Kod İçinde Kullanım

```javascript
const tokenService = require('./src/services/tokenService');

// 1. Token al (cache'den veya yeni)
const token = await tokenService.getAccessToken();

// 2. Authorization header al
const authHeader = await tokenService.getAuthorizationHeader();
// Sonuç: "Bearer eyJraWQiOiJrZzpjZDU0MzcxO..."

// 3. Token bilgisi al
const info = tokenService.getTokenInfo();
console.log(info);
// {
//   hasToken: true,
//   isValid: true,
//   expiryTime: "2025-12-16T07:24:37.761Z",
//   tokenType: "Bearer"
// }

// 4. Token'ı PLM API çağrılarında kullan
const axios = require('axios');
const PLM_CONFIG = require('./src/config/plm.config');

async function callPlmApi() {
  const authHeader = await tokenService.getAuthorizationHeader();
  
  const response = await axios.get(
    `${PLM_CONFIG.ionApiUrl}/path/to/api`,
    {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data;
}
```

## 🌐 API Endpoints

### 1. Token Al
```bash
curl http://localhost:3000/api/token
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJraWQiOiJrZzpjZDU0MzcxO...",
  "tokenType": "Bearer",
  "expiresAt": "2025-12-16T07:24:37.761Z",
  "timestamp": "2025-12-16T06:24:37.761Z"
}
```

### 2. Token Bilgisi
```bash
curl http://localhost:3000/api/token/info
```

**Response:**
```json
{
  "success": true,
  "tokenInfo": {
    "hasToken": true,
    "isValid": true,
    "expiryTime": "2025-12-16T07:24:37.761Z",
    "tokenType": "Bearer"
  },
  "timestamp": "2025-12-16T06:30:00.000Z"
}
```

### 3. Token Yenile
```bash
curl -X POST http://localhost:3000/api/token/refresh
```

### 4. Token İptal Et
```bash
curl -X POST http://localhost:3000/api/token/revoke
```

## 🧪 Test

```bash
# Token servisini test et
node test/token.test.js
```

## 📝 PLM Config

`src/config/plm.config.js` dosyasında PLM bağlantı bilgileri:

```javascript
const PLM_CONFIG = {
  tenantId: 'ATJZAMEWEF5P4SNV_TST',
  clientId: 'ATJZAMEWEF5P4SNV_TST~vlWkwz2P74KAmRFfihVsdK5yjnHvnfPUrcOt4nl6gkI',
  clientSecret: 'HU1TUcBOX1rkp-uuYKUQ3simFEYzPKNM-XIyf4ewIxe-TYUZOK7RAlXUPd_FwSZMAslt8I9RZmv23xItVKY8EQ',
  serviceAccountAccessKey: 'ATJZAMEWEF5P4SNV_TST#5d3TLFCMqK_CR9wmWsLbIn1UnLv2d8S0ohtIX4TZ4PUBXyvtx-RjHjscLzfB9NBAGZfdWMgzFt3DCpWoJMOHEg',
  serviceAccountSecretKey: 'g0oBJ4ubPxJwgJZjAxAfguExlH3V5-cFF0zove_9Fb_7h4C67eXko45T9Ltjw-DYzfYUbU_iQbCZuTW6wYeX5Q',
  ionApiUrl: 'https://mingle-ionapi.eu1.inforcloudsuite.com',
  providerUrl: 'https://mingle-sso.eu1.inforcloudsuite.com:443/ATJZAMEWEF5P4SNV_TST/as/'
};
```

## 🔄 Token Lifecycle

1. **İlk İstek**: `getAccessToken()` çağrıldığında yeni token alınır
2. **Cache**: Token memory'de saklanır (singleton pattern)
3. **Tekrar Kullanım**: Sonraki istekler cache'deki token'ı kullanır
4. **Otomatik Yenileme**: Token süresi dolmadan 5 dakika önce yeni token alınır
5. **Manuel Yenileme**: `/api/token/refresh` ile zorla yenilenebilir

## 🚀 Sonraki Adımlar

Token servisini diğer PLM API çağrılarınızda kullanabilirsiniz:

```javascript
// PLM API çağrısı örneği
const tokenService = require('./services/tokenService');
const axios = require('axios');

async function getBomData(styleId) {
  const authHeader = await tokenService.getAuthorizationHeader();
  
  const response = await axios.get(
    `${PLM_CONFIG.ionApiUrl}/IONSERVICES/api/v1/bom/${styleId}`,
    {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data;
}
```

## 📚 Kaynaklar

- [Infor ION API Documentation](https://docs.infor.com/ion/latest/)
- [OAuth2.0 Specification](https://oauth.net/2/)

## 🆘 Sorun Giderme

### Token alınamıyor
- Credentials'ları kontrol edin (`plm.config.js`)
- Network bağlantısını kontrol edin
- Console log'larına bakın

### Token geçersiz
- `/api/token/refresh` ile token'ı yenileyin
- Sunucuyu yeniden başlatın

### Port 3000 kullanımda
```bash
# Farklı port kullanın
PORT=3001 npm start
```

