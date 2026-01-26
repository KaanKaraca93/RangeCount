const express = require('express');
const router = express.Router();
const rangeCountSourceService = require('../services/rangeCountSourceService');

/**
 * @route GET /api/range-count-source
 * @desc Placeholder bazlı plan vs gerçekleşen karşılaştırması (pivotlanmamış)
 * @returns {Object} success, count, data, summary
 */
router.get('/range-count-source', async (req, res) => {
  try {
    console.log('📊 Range Count Source hesaplama başlatılıyor...');
    
    const data = await rangeCountSourceService.matchColorwaysToPlaceholders();
    const summary = rangeCountSourceService.calculateSummary(data);
    
    res.json({
      success: true,
      count: data.length,
      data: data,
      summary: summary,
      meta: {
        description: 'Placeholder bazlı plan vs gerçekleşen (pivotlanmamış)',
        excludeRules: [
          'StyleColorways = null',
          'FreeFieldOne != B (sadece B cluster)',
          'ColorwayStatus = 4 (iptal)'
        ],
        matchingCriteria: [
          'BrandId',
          'SubCategoryId (Ürün Grubu)',
          'SubSubCategoryId (Ürün Alt Grup)',
          'CUD1 (Fashion Pyramid)',
          'CUD4 (Life Style)',
          'CUD5 (FT)',
          'UDF5Id (Segment)'
        ]
      }
    });
    
  } catch (error) {
    console.error('❌ Range Count Source API hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/range-count-source/summary
 * @desc Sadece özet istatistikler
 * @returns {Object} success, summary
 */
router.get('/range-count-source/summary', async (req, res) => {
  try {
    console.log('📊 Range Count Source özet hesaplama...');
    
    const data = await rangeCountSourceService.matchColorwaysToPlaceholders();
    const summary = rangeCountSourceService.calculateSummary(data);
    
    res.json({
      success: true,
      summary: summary
    });
    
  } catch (error) {
    console.error('❌ Range Count Source Summary API hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
