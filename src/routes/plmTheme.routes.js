const express = require('express');
const router = express.Router();
const plmThemeService = require('../services/plmThemeService');

/**
 * @swagger
 * /api/plm-themes:
 *   get:
 *     summary: PLM'den gerçek tema verilerini getir
 *     description: Excel'deki tema hedefleri ile PLM'deki gerçek verileri eşleştirip hesaplar
 *     tags: [PLM Theme Data]
 *     responses:
 *       200:
 *         description: Başarılı
 */
router.get('/plm-themes', async (req, res) => {
  try {
    console.log('🎨 PLM Tema hesaplaması başlatılıyor...');
    
    const themeData = await plmThemeService.calculateThemeProgress();
    
    res.json({
      success: true,
      count: themeData.length,
      data: themeData
    });
    
  } catch (error) {
    console.error('Error calculating PLM themes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate PLM themes',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/plm-themes/summary:
 *   get:
 *     summary: PLM tema özet istatistikleri
 *     description: Genel tema tamamlanma istatistikleri
 *     tags: [PLM Theme Data]
 *     responses:
 *       200:
 *         description: Başarılı
 */
router.get('/plm-themes/summary', async (req, res) => {
  try {
    console.log('🎨 PLM Tema özet hesaplaması...');
    
    const themeData = await plmThemeService.calculateThemeProgress();
    const summary = plmThemeService.calculateSummary(themeData);
    
    res.json({
      success: true,
      summary: summary
    });
    
  } catch (error) {
    console.error('Error calculating PLM theme summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate PLM theme summary',
      message: error.message
    });
  }
});

module.exports = router;

