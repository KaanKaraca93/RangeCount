const express = require('express');
const router = express.Router();
const rangeDataService = require('../services/rangeDataService');

/**
 * @swagger
 * /api/ranges:
 *   get:
 *     summary: Tüm range verilerini getir
 *     description: Excel'den yüklenen tüm range (option) verilerini döndürür. 53 satır veri içerir.
 *     tags: [Range Data]
 *     responses:
 *       200:
 *         description: Başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 53
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RangeData'
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
 * @swagger
 * /api/ranges/summary:
 *   get:
 *     summary: Özet istatistikler
 *     description: Genel ve grup bazında tamamlanma istatistiklerini döndürür
 *     tags: [Range Data]
 *     responses:
 *       200:
 *         description: Başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 summary:
 *                   $ref: '#/components/schemas/Summary'
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
 * @swagger
 * /api/ranges/lifestyle/{group}:
 *   get:
 *     summary: Life Style Grup'a göre filtrele
 *     description: Belirli bir life style grubuna ait range verilerini döndürür
 *     tags: [Range Data]
 *     parameters:
 *       - in: path
 *         name: group
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Business, Essential, Mono, Tema]
 *         description: Life style grup adı
 *         example: Mono
 *     responses:
 *       200:
 *         description: Başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 group:
 *                   type: string
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RangeData'
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
 * @swagger
 * /api/ranges/product/{group}:
 *   get:
 *     summary: Ürün Alt Grup'a göre filtrele
 *     description: Belirli bir ürün alt grubuna ait range verilerini döndürür (ELBISE, BLUZ, PANTOLON, vb.)
 *     tags: [Range Data]
 *     parameters:
 *       - in: path
 *         name: group
 *         required: true
 *         schema:
 *           type: string
 *         description: Ürün alt grup adı
 *         example: ELBISE
 *     responses:
 *       200:
 *         description: Başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 productGroup:
 *                   type: string
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RangeData'
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
 * @swagger
 * /api/ranges/reload:
 *   post:
 *     summary: Excel verisini yeniden yükle
 *     description: Excel dosyasını yeniden okuyup cache'i günceller
 *     tags: [Range Data]
 *     responses:
 *       200:
 *         description: Başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 count:
 *                   type: integer
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

