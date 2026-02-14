const express = require('express');
const router = express.Router();
const styleCostingService = require('../services/styleCostingService');

/**
 * @route   GET /api/style-costing
 * @desc    Her colorway için costing bilgileri (SupplierId=2)
 *          Her satır = 1 Colorway
 *          Kolonlar = Sabit bilgiler + Tüm Cost Elements + Tüm Extended Fields
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    console.log('📊 Style Costing API çağrıldı');
    
    const data = await styleCostingService.calculateCostingData();
    
    res.json({
      success: true,
      count: data.length,
      data: data
    });
    
  } catch (error) {
    console.error('❌ Style Costing API hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/style-costing/summary
 * @desc    Costing verilerinin özeti
 * @access  Public
 */
router.get('/summary', async (req, res) => {
  try {
    console.log('📊 Style Costing Summary API çağrıldı');
    
    const summary = await styleCostingService.getSummary();
    
    res.json({
      success: true,
      summary: summary
    });
    
  } catch (error) {
    console.error('❌ Style Costing Summary API hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
