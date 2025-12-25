const express = require('express');
const router = express.Router();
const plmStyleService = require('../services/plmStyleService');

/**
 * @swagger
 * /api/past-season-data:
 *   get:
 *     summary: Geçen sezon verilerini getir (Random POC Data)
 *     description: POC için random geçen sezon verileri döndürür - PLM'e bağlanmaz
 *     tags: [PLM Style Data]
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
 *                 data:
 *                   type: object
 */
router.get('/past-season-data', async (req, res) => {
  try {
    console.log(`🔍 Geçen sezon verisi isteniyor (Random POC)`);
    
    const pastSeasonData = plmStyleService.generateRandomPastSeasonData();
    
    res.json({
      success: true,
      ...pastSeasonData
    });
    
  } catch (error) {
    console.error('Error getting past season data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get past season data',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/plm-style/{styleId}:
 *   get:
 *     summary: PLM'den style bilgisi getir (test için)
 *     description: Direkt PLM'den style bilgisi çeker
 *     tags: [PLM Style Data]
 *     parameters:
 *       - in: path
 *         name: styleId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 158
 *     responses:
 *       200:
 *         description: Başarılı
 */
router.get('/plm-style/:styleId', async (req, res) => {
  try {
    const styleId = parseInt(req.params.styleId);
    
    console.log(`🔍 PLM style bilgisi isteniyor: StyleId=${styleId}`);
    
    const styleData = await plmStyleService.getStyleFromPlm(styleId);
    
    if (!styleData) {
      return res.status(404).json({
        success: false,
        error: 'Style not found'
      });
    }
    
    res.json({
      success: true,
      data: styleData
    });
    
  } catch (error) {
    console.error('Error getting PLM style:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get PLM style',
      message: error.message
    });
  }
});

module.exports = router;

