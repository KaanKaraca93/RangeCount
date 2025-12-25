const express = require('express');
const router = express.Router();
const plmRangeService = require('../services/plmRangeService');

/**
 * @swagger
 * /api/plm-ranges:
 *   get:
 *     summary: PLM'den gerçek range verilerini getir
 *     description: Excel'deki plan ile PLM'deki gerçek verileri eşleştirip hesaplar
 *     tags: [PLM Range Data]
 *     responses:
 *       200:
 *         description: Başarılı
 */
router.get('/plm-ranges', async (req, res) => {
  try {
    console.log('🔍 PLM Range hesaplaması başlatılıyor...');
    
    const rangeData = await plmRangeService.calculateRangeFromPLM();
    
    res.json({
      success: true,
      count: rangeData.length,
      data: rangeData
    });
    
  } catch (error) {
    console.error('Error calculating PLM ranges:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate PLM ranges',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/plm-ranges/summary:
 *   get:
 *     summary: PLM range özet istatistikleri
 *     description: Genel ve grup bazında tamamlanma istatistikleri
 *     tags: [PLM Range Data]
 *     responses:
 *       200:
 *         description: Başarılı
 */
router.get('/plm-ranges/summary', async (req, res) => {
  try {
    console.log('🔍 PLM Range özet hesaplaması...');
    
    const rangeData = await plmRangeService.calculateRangeFromPLM();
    const summary = plmRangeService.calculateSummary(rangeData);
    
    res.json({
      success: true,
      summary: summary
    });
    
  } catch (error) {
    console.error('Error calculating PLM summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate PLM summary',
      message: error.message
    });
  }
});

module.exports = router;

