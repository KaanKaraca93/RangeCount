const express = require('express');
const router = express.Router();
const rangeCountSourceV6Service = require('../services/rangeCountSourceV6Service');

router.get('/', async (req, res) => {
  try {
    console.log('\n📥 GET /api/range-count-source-v6');
    const data = await rangeCountSourceV6Service.matchColorwaysToPlaceholders();
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    console.error('❌ /api/range-count-source-v6 hatası:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    console.log('\n📥 GET /api/range-count-source-v6/summary');
    const data = await rangeCountSourceV6Service.matchColorwaysToPlaceholders();
    const summary = rangeCountSourceV6Service.calculateSummary(data);
    res.json({ success: true, summary });
  } catch (error) {
    console.error('❌ /api/range-count-source-v6/summary hatası:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
