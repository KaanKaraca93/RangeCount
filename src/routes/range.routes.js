const express = require('express');
const router = express.Router();
const rangeDataService = require('../services/rangeDataService');

/**
 * Tüm range verilerini getir
 */
router.get('/ranges', (req, res) => {
  try {
    const data = rangeDataService.getAllData();
    
    res.json({
      success: true,
      count: data.length,
      data: data
    });
  } catch (error) {
    console.error('Error getting ranges:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get range data',
      message: error.message
    });
  }
});

/**
 * Özet istatistikler
 */
router.get('/ranges/summary', (req, res) => {
  try {
    const summary = rangeDataService.getSummary();
    
    res.json({
      success: true,
      summary: summary
    });
  } catch (error) {
    console.error('Error getting summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get summary',
      message: error.message
    });
  }
});

/**
 * Life Style Grup'a göre filtrele
 */
router.get('/ranges/lifestyle/:group', (req, res) => {
  try {
    const group = req.params.group;
    const data = rangeDataService.getByLifeStyleGroup(group);
    
    res.json({
      success: true,
      group: group,
      count: data.length,
      data: data
    });
  } catch (error) {
    console.error('Error getting lifestyle group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get lifestyle group data',
      message: error.message
    });
  }
});

/**
 * Ürün Alt Grup'a göre filtrele
 */
router.get('/ranges/product/:group', (req, res) => {
  try {
    const group = req.params.group;
    const data = rangeDataService.getByProductGroup(group);
    
    res.json({
      success: true,
      productGroup: group,
      count: data.length,
      data: data
    });
  } catch (error) {
    console.error('Error getting product group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get product group data',
      message: error.message
    });
  }
});

/**
 * Veriyi yeniden yükle
 */
router.post('/ranges/reload', (req, res) => {
  try {
    rangeDataService.reload();
    
    res.json({
      success: true,
      message: 'Range data reloaded successfully',
      count: rangeDataService.getAllData().length
    });
  } catch (error) {
    console.error('Error reloading data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reload data',
      message: error.message
    });
  }
});

module.exports = router;

