const express = require('express');
const router = express.Router();
const rangeCountSourceV6_2Service = require('../services/rangeCountSourceV6_2Service');

/**
 * @swagger
 * tags:
 *   - name: Range Count Source V6.2
 *     description: Placeholder (plan) vs gerçekleşen eşleştirmesi — Alt_Sezon bazlı (V6.2)
 */

/**
 * @swagger
 * /api/range-count-source-v6-2:
 *   get:
 *     summary: V6.2 plan vs gerçekleşen (Alt_Sezon bazlı)
 *     description: >
 *       RangeSayacv6_2.xlsx'teki her placeholder (plan) satırını PLM'deki B-cluster
 *       colorway'lerle eşleştirir. V6 ile aynı kriterler kullanılır; tek fark,
 *       eşleştirmede FreeFieldThree yerine Alt_Sezon kullanılmasıdır. Alt_Sezon,
 *       colorway temasının PID'sinden (Theme.Description) IDM
 *       /IDM/api/items/{pid} → attrs.attr[Alt_Sezon] üzerinden çözülür.
 *       Eşleşmeyen B-cluster colorway'ler Plan=0 / Gerçekleşen=1 olarak eklenir.
 *     tags: [Range Count Source V6.2]
 *     responses:
 *       200:
 *         description: Başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 1940
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       marka: { type: string, example: IPEKYOL }
 *                       brandId: { type: integer, example: 4 }
 *                       opsiyonKodu: { type: string, nullable: true, example: PH1137 }
 *                       urunGrubu: { type: string, example: BLUZ }
 *                       subCategoryId: { type: integer, example: 21 }
 *                       urunAltGrup: { type: string, example: BLUZ }
 *                       subSubCategoryId: { type: integer, example: 57 }
 *                       fashionPyramid: { type: string, example: Fashion Core }
 *                       fashionPyramidId: { type: integer, example: 8 }
 *                       lifeStyleGrup: { type: string, example: Mono }
 *                       lifeStyleGrupId: { type: integer, example: 1 }
 *                       ft: { type: string, example: Standart }
 *                       ftId: { type: integer, example: 1 }
 *                       segment: { type: string, example: Segment 2 }
 *                       segmentId: { type: integer, example: 2 }
 *                       seasonId: { type: integer, example: 11 }
 *                       altSezon: { type: string, nullable: true, example: SS1 }
 *                       planOptionSay: { type: integer, example: 1 }
 *                       gerceklesenOptionSay: { type: integer, example: 1 }
 *                       gerceklesenUrunKodu: { type: string, example: "IW6260002076" }
 *                       gerceklesenRenkKodu: { type: string, example: "003" }
 *                       gerceklesenRenkAdi: { type: string }
 *                       gerceklesenPsf: { type: string, nullable: true }
 *                       gerceklesenOnAdet: { type: number, nullable: true }
 *                       gerceklesenPlanlananAdet: { type: number, nullable: true }
 *                       gerceklesenHedefMarkUp: { type: number, nullable: true }
 *                       gerceklesenAlimHedefFiyati: { type: number, nullable: true }
 *                       gerceklesenDetay:
 *                         type: array
 *                         items:
 *                           type: object
 *       500:
 *         description: Sunucu hatası
 */
router.get('/', async (req, res) => {
  try {
    console.log('\n📥 GET /api/range-count-source-v6-2');
    const data = await rangeCountSourceV6_2Service.matchColorwaysToPlaceholders();
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    console.error('❌ /api/range-count-source-v6-2 hatası:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/range-count-source-v6-2/summary:
 *   get:
 *     summary: V6.2 özet istatistikleri
 *     description: Plan vs gerçekleşen özetini döndürür (toplam planlanan/gerçekleşen, fark, eşleşen, sadece plan, sadece gerçekleşen).
 *     tags: [Range Count Source V6.2]
 *     responses:
 *       200:
 *         description: Başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 summary:
 *                   type: object
 *                   properties:
 *                     toplamPlanlanan: { type: integer, example: 522 }
 *                     toplamGerceklesen: { type: integer, example: 1458 }
 *                     fark: { type: integer, example: 936 }
 *                     eslesen: { type: integer, example: 40 }
 *                     sadecePlanlanan: { type: integer, example: 482 }
 *                     sadaceGerceklesen: { type: integer, example: 1418 }
 *                     toplamKayit: { type: integer, example: 1940 }
 *       500:
 *         description: Sunucu hatası
 */
router.get('/summary', async (req, res) => {
  try {
    console.log('\n📥 GET /api/range-count-source-v6-2/summary');
    const data = await rangeCountSourceV6_2Service.matchColorwaysToPlaceholders();
    const summary = rangeCountSourceV6_2Service.calculateSummary(data);
    res.json({ success: true, summary });
  } catch (error) {
    console.error('❌ /api/range-count-source-v6-2/summary hatası:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
