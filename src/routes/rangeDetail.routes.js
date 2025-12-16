const express = require('express');
const router = express.Router();
const rangeDetailService = require('../services/rangeDetailService');

/**
 * @swagger
 * /api/range-details:
 *   get:
 *     summary: Tüm range detay verilerini getir
 *     description: Kumaş tipi ve açıklama detaylarını içeren tüm verileri döndürür
 *     tags: [Range Details]
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
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/range-details', (req, res) => {
  try {
    const data = rangeDetailService.getAllDetails();
    
    res.json({
      success: true,
      count: data.length,
      data: data
    });
  } catch (error) {
    console.error('Error getting range details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get range detail data',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/range-details/lifestyle/{group}:
 *   get:
 *     summary: Life Style Grup'a göre detayları filtrele
 *     tags: [Range Details]
 *     parameters:
 *       - in: path
 *         name: group
 *         required: true
 *         schema:
 *           type: string
 *         example: Mono
 *     responses:
 *       200:
 *         description: Başarılı
 */
router.get('/range-details/lifestyle/:group', (req, res) => {
  try {
    const group = req.params.group;
    const data = rangeDetailService.getByLifeStyleGroup(group);
    
    res.json({
      success: true,
      group: group,
      count: data.length,
      data: data
    });
  } catch (error) {
    console.error('Error getting range details by lifestyle:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get range details',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/range-details/product/{group}:
 *   get:
 *     summary: Ürün Alt Grup'a göre detayları filtrele
 *     tags: [Range Details]
 *     parameters:
 *       - in: path
 *         name: group
 *         required: true
 *         schema:
 *           type: string
 *         example: ELBISE
 *     responses:
 *       200:
 *         description: Başarılı
 */
router.get('/range-details/product/:group', (req, res) => {
  try {
    const group = req.params.group;
    const data = rangeDetailService.getByProductGroup(group);
    
    res.json({
      success: true,
      productGroup: group,
      count: data.length,
      data: data
    });
  } catch (error) {
    console.error('Error getting range details by product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get range details',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/range-details/fabric/{type}:
 *   get:
 *     summary: Kumaş Tipi'ne göre detayları filtrele
 *     tags: [Range Details]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         example: Dokuma
 *     responses:
 *       200:
 *         description: Başarılı
 */
router.get('/range-details/fabric/:type', (req, res) => {
  try {
    const type = req.params.type;
    const data = rangeDetailService.getByFabricType(type);
    
    res.json({
      success: true,
      fabricType: type,
      count: data.length,
      data: data
    });
  } catch (error) {
    console.error('Error getting range details by fabric:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get range details',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/range-details/detail/{lifeStyleGroup}/{productGroup}:
 *   get:
 *     summary: Belirli bir Life Style ve Ürün Alt Grup kombinasyonunun detayı
 *     tags: [Range Details]
 *     parameters:
 *       - in: path
 *         name: lifeStyleGroup
 *         required: true
 *         schema:
 *           type: string
 *         example: Mono
 *       - in: path
 *         name: productGroup
 *         required: true
 *         schema:
 *           type: string
 *         example: ELBISE
 *     responses:
 *       200:
 *         description: Başarılı
 */
router.get('/range-details/detail/:lifeStyleGroup/:productGroup', (req, res) => {
  try {
    const { lifeStyleGroup, productGroup } = req.params;
    const data = rangeDetailService.getDetail(lifeStyleGroup, productGroup);
    
    res.json({
      success: true,
      lifeStyleGroup: lifeStyleGroup,
      productGroup: productGroup,
      count: data.length,
      data: data
    });
  } catch (error) {
    console.error('Error getting range detail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get range detail',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/range-details/summary/fabric:
 *   get:
 *     summary: Kumaş tipi bazında özet istatistikler
 *     tags: [Range Details]
 *     responses:
 *       200:
 *         description: Başarılı
 */
router.get('/range-details/summary/fabric', (req, res) => {
  try {
    const summary = rangeDetailService.getSummaryByFabric();
    
    res.json({
      success: true,
      summary: summary
    });
  } catch (error) {
    console.error('Error getting fabric summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get fabric summary',
      message: error.message
    });
  }
});

module.exports = router;

