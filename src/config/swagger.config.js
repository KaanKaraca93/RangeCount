const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Ipekyol Range Sayaç API',
      version: '1.0.0',
      description: `
### PLM Range Planning & Tracking API

Bu API, Ipekyol koleksiyon planlama ve takip sistemi için range (option) verilerini sağlar.

**Özellikler:**
- ✅ OAuth2.0 ile PLM token yönetimi
- ✅ Excel tabanlı range verileri
- ✅ Life Style Grup ve Ürün Alt Grup filtreleme
- ✅ Gerçek zamanlı tamamlanma oranları

**Formüller:**
- \`Fark = P_Opt - G_Opt\`
- \`Oran = (G_Opt / P_Opt) * 100%\`

**Veri Alanları:**
- **P_Opt**: Planlanan option sayısı
- **T_Opt**: Taslak (havuzda bekleyen) option sayısı
- **G_Opt**: Gerçekleşen (koleksiyona alınan) option sayısı
- **Fark**: Hedeften sapma
- **Oran**: Tamamlanma yüzdesi
      `,
      contact: {
        name: 'Ipekyol PLM Team',
        email: 'plm@ipekyol.com.tr'
      }
    },
    servers: [
      {
        url: 'https://rangecount-652fcc1f20d9.herokuapp.com',
        description: 'Production Server (Heroku)'
      },
      {
        url: 'http://localhost:3000',
        description: 'Development Server'
      }
    ],
    tags: [
      {
        name: 'Token',
        description: 'PLM OAuth2.0 token yönetimi'
      },
      {
        name: 'Range Data',
        description: 'Koleksiyon range verileri ve istatistikler'
      }
    ],
    components: {
      schemas: {
        RangeData: {
          type: 'object',
          properties: {
            Marka: {
              type: 'string',
              example: 'IPEKYOL',
              description: 'Marka adı'
            },
            Kategori: {
              type: 'string',
              example: 'TEKSTIL',
              description: 'Ürün kategorisi'
            },
            'Life Style Grup': {
              type: 'string',
              example: 'Mono',
              enum: ['Business', 'Essential', 'Mono', 'Tema'],
              description: 'Life style grubu'
            },
            'Ürün Alt Grup': {
              type: 'string',
              example: 'ELBISE',
              description: 'Ürün alt grubu (ELBISE, BLUZ, PANTOLON, vb.)'
            },
            P_Opt: {
              type: 'integer',
              example: 56,
              description: 'Planlanan option sayısı'
            },
            T_Opt: {
              type: 'integer',
              example: 4,
              description: 'Taslak option sayısı (havuzda bekleyen)'
            },
            G_Opt: {
              type: 'integer',
              example: 53,
              description: 'Gerçekleşen option sayısı (koleksiyona alınan)'
            },
            Fark: {
              type: 'integer',
              example: 3,
              description: 'P_Opt - G_Opt (hedeften sapma)'
            },
            Oran: {
              type: 'string',
              example: '95%',
              description: 'Tamamlanma oranı (G_Opt / P_Opt * 100%)'
            }
          }
        },
        Summary: {
          type: 'object',
          properties: {
            genel: {
              type: 'object',
              properties: {
                toplamPlanlanan: {
                  type: 'integer',
                  example: 1094
                },
                toplamGerceklesen: {
                  type: 'integer',
                  example: 838
                },
                toplamTaslak: {
                  type: 'integer',
                  example: 134
                },
                toplamFark: {
                  type: 'integer',
                  example: 256
                },
                genelTamamlanma: {
                  type: 'string',
                  example: '77%'
                }
              }
            },
            grupBazinda: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  grup: { type: 'string', example: 'Mono' },
                  planlanan: { type: 'integer', example: 489 },
                  gerceklesen: { type: 'integer', example: 377 },
                  fark: { type: 'integer', example: 112 },
                  tamamlanma: { type: 'string', example: '77%' }
                }
              }
            }
          }
        },
        TokenResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            accessToken: { type: 'string', example: 'eyJraWQiOiJrZzpjZDU0...' },
            tokenType: { type: 'string', example: 'Bearer' },
            expiresAt: { type: 'string', format: 'date-time' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

