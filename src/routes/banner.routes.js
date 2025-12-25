const express = require('express');
const router = express.Router();
const plmRangeService = require('../services/plmRangeService');
const plmThemeService = require('../services/plmThemeService');

/**
 * @swagger
 * /api/banner:
 *   get:
 *     summary: Banner için özet metrikleri
 *     description: Ürün kategorisi ve tema bazlı tamamlanma metriklerini tek endpoint'te döner
 *     tags: [Banner]
 *     responses:
 *       200:
 *         description: Başarılı
 */
router.get('/banner', async (req, res) => {
  try {
    console.log('📊 Banner metrikleri hesaplanıyor...');
    
    // Paralel olarak hem range hem theme verilerini çek
    const [rangeData, themeData] = await Promise.all([
      plmRangeService.calculateRangeFromPLM(),
      plmThemeService.calculateThemeProgress()
    ]);
    
    // Range (Ürün Kategorisi) metrikleri
    const totalRangePOpt = rangeData.reduce((sum, row) => sum + row.pOpt, 0);
    const totalRangeGOpt = rangeData.reduce((sum, row) => sum + row.gOpt, 0);
    const rangeFark = totalRangePOpt - totalRangeGOpt;
    const rangeCompletionRate = totalRangePOpt > 0 
      ? Math.round((totalRangeGOpt / totalRangePOpt) * 100) 
      : 0;
    
    // Theme (Tema) metrikleri
    const totalThemePOpt = themeData.reduce((sum, row) => sum + row.pOpt, 0);
    const totalThemeGOpt = themeData.reduce((sum, row) => sum + row.gOpt, 0);
    const themeFark = totalThemePOpt - totalThemeGOpt;
    const themeCompletionRate = totalThemePOpt > 0 
      ? Math.round((totalThemeGOpt / totalThemePOpt) * 100) 
      : 0;
    
    res.json({
      success: true,
      data: {
        urunKategorisi: {
          toplamPOpt: totalRangePOpt,
          toplamGOpt: totalRangeGOpt,
          fark: rangeFark,
          tamamlanmaOrani: `${rangeCompletionRate}%`
        },
        tema: {
          toplamPOpt: totalThemePOpt,
          toplamGOpt: totalThemeGOpt,
          fark: themeFark,
          tamamlanmaOrani: `${themeCompletionRate}%`
        }
      }
    });
    
  } catch (error) {
    console.error('Error calculating banner metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate banner metrics',
      message: error.message
    });
  }
});

module.exports = router;

