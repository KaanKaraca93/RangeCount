const express = require('express');
const router = express.Router();
const plmRangeV7_2Service = require('../services/plmRangeV7_2Service');

/**
 * @swagger
 * tags:
 *   - name: Range V7.2
 *     description: Range takibi (V7.2) — Alt_Sezon + SubCategoryId + LifeStyleGroup kırılımı
 */

/**
 * @swagger
 * /api/range-v7-2:
 *   get:
 *     summary: V7.2 plan vs gerçekleşen (Alt_Sezon + LifeStyleGroup)
 *     description: >
 *       V7 mantığının devamı. Farklar: (1) eşleştirmede FreeFieldThree yerine
 *       Alt_Sezon (colorway teması → IDM /IDM/api/items/{Theme.Description} →
 *       attrs.attr[Alt_Sezon]); (2) ProductSubSubCategory.Id yerine SubCategory.Id;
 *       (3) LifeStyleGroup kırılımı (ColorwayUserDefinedField4.Id → 1,2=Mono,
 *       8=Business, 3=Tema, diğer=Diğer) hem matching key'e hem özete dahil.
 *     tags: [Range V7.2]
 *     responses:
 *       200:
 *         description: Başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 count: { type: integer, example: 300 }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       placeholderId: { type: string, nullable: true, example: PH1 }
 *                       marka: { type: string, example: Twist }
 *                       brandId: { type: integer, example: 8 }
 *                       urunGrubu: { type: string, example: CEKET }
 *                       subCategoryId: { type: integer, example: 54 }
 *                       rangeTag: { type: string, example: Range1 }
 *                       range: { type: string, example: Detay }
 *                       extFldId: { type: string }
 *                       rangeDetayi: { type: string, example: Aksesuar }
 *                       dropDownValue: { type: integer, example: 144 }
 *                       cud5Id: { type: integer, nullable: true, example: 1 }
 *                       seasonId: { type: integer, example: 11 }
 *                       altSezon: { type: string, nullable: true, example: SS1 }
 *                       lifeStyleGroup: { type: string, example: Tema }
 *                       lifeStyleGroupId: { type: integer, nullable: true, example: 3 }
 *                       plan: { type: integer, example: 1 }
 *                       gerceklesen: { type: integer, example: 1 }
 *                       styleId: { type: integer, nullable: true }
 *                       styleCode: { type: string, nullable: true }
 *                       colorwayId: { type: integer, nullable: true }
 *                       colorwayCode: { type: string, nullable: true }
 *                       colorwayName: { type: string, nullable: true }
 *       500:
 *         description: Sunucu hatası
 */
router.get('/', async (req, res) => {
  try {
    console.log('\n📥 GET /api/range-v7-2');
    const data = await plmRangeV7_2Service.calculateRangeData();
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    console.error('❌ /api/range-v7-2 hatası:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/range-v7-2/summary:
 *   get:
 *     summary: V7.2 özet (LifeStyleGroup bazlı)
 *     description: Genel toplamlar ve LifeStyleGroup (Mono/Business/Tema/Diğer) bazında plan vs gerçekleşen kırılımı.
 *     tags: [Range V7.2]
 *     responses:
 *       200:
 *         description: Başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 summary:
 *                   type: object
 *                   properties:
 *                     toplamPlan: { type: integer, example: 266 }
 *                     toplamGerceklesen: { type: integer, example: 120 }
 *                     eslesen: { type: integer, example: 90 }
 *                     sadecePlanlanan: { type: integer, example: 176 }
 *                     sadaceGerceklesen: { type: integer, example: 30 }
 *                     toplamKayit: { type: integer, example: 300 }
 *                     grupBazinda:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           lifeStyleGroup: { type: string, example: Tema }
 *                           toplamPlan: { type: integer, example: 266 }
 *                           toplamGerceklesen: { type: integer, example: 120 }
 *                           eslesen: { type: integer, example: 90 }
 *                           sadecePlanlanan: { type: integer, example: 176 }
 *                           sadaceGerceklesen: { type: integer, example: 30 }
 *       500:
 *         description: Sunucu hatası
 */
router.get('/summary', async (req, res) => {
  try {
    console.log('\n📥 GET /api/range-v7-2/summary');
    const data = await plmRangeV7_2Service.calculateRangeData();
    const summary = plmRangeV7_2Service.calculateSummary(data);
    res.json({ success: true, summary });
  } catch (error) {
    console.error('❌ /api/range-v7-2/summary hatası:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
