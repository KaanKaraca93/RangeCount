const express = require('express');
const router = express.Router();
const rangeCountSourceV2Service = require('../services/rangeCountSourceV2Service');

/**
 * GET /api/range-count-source-v2
 * Detay: Her placeholder için plan ve gerçekleşen verisi
 * V2: Name bazlı Excel + GenericLookUpAll çözümlemesi, CUD5 olmadan, Season+Faz eklendi
 */
router.get('/', async (req, res) => {
  try {
    console.log('\n📥 GET /api/range-count-source-v2');

    const data = await rangeCountSourceV2Service.matchColorwaysToPlaceholders();

    res.json({
      success: true,
      count: data.length,
      data: data
    });
  } catch (error) {
    console.error('❌ /api/range-count-source-v2 hatası:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/range-count-source-v2/summary
 * Özet: Toplam plan vs gerçekleşen (faz ve sezon bazında da)
 */
router.get('/summary', async (req, res) => {
  try {
    console.log('\n📥 GET /api/range-count-source-v2/summary');

    const data = await rangeCountSourceV2Service.matchColorwaysToPlaceholders();
    const summary = rangeCountSourceV2Service.calculateSummary(data);

    res.json({
      success: true,
      summary: summary
    });
  } catch (error) {
    console.error('❌ /api/range-count-source-v2/summary hatası:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/range-count-source-v2/cache/clear
 * GenericLookUpAll cache'ini temizle (PLM lookup verileri değiştiyse)
 */
router.post('/cache/clear', (req, res) => {
  rangeCountSourceV2Service.clearLookupCache();
  res.json({
    success: true,
    message: 'GenericLookUpAll cache temizlendi. Sonraki istekte PLM\'den yeniden çekilecek.'
  });
});

module.exports = router;
