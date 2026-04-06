const express = require('express');
const router = express.Router();
const plmRangeV7Service = require('../services/plmRangeV7Service');

router.get('/', async (req, res) => {
  try {
    console.log('\n📥 GET /api/range-v7');
    const data = await plmRangeV7Service.calculateRangeData();
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    console.error('❌ /api/range-v7 hatası:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    console.log('\n📥 GET /api/range-v7/summary');
    const data = await plmRangeV7Service.calculateRangeData();
    const summary = plmRangeV7Service.calculateSummary(data);
    res.json({ success: true, summary });
  } catch (error) {
    console.error('❌ /api/range-v7/summary hatası:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
