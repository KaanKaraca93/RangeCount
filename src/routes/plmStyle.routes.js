const express = require('express');
const router = express.Router();
const plmStyleService = require('../services/plmStyleService');

/**
 * @swagger
 * /api/past-season-data:
 *   post:
 *     summary: Geçen sezon verilerini getir
 *     description: StyleId ile PLM'den UDF7 kontrolü yaparak geçen sezon verilerini döndürür
 *     tags: [PLM Style Data]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - StyleId
 *             properties:
 *               StyleId:
 *                 type: integer
 *                 example: 158
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
 *                 styleId:
 *                   type: integer
 *                 styleCode:
 *                   type: string
 *                 previousSeasonStyleCode:
 *                   type: string
 *                 hasData:
 *                   type: boolean
 *                 data:
 *                   type: object
 */
router.post('/past-season-data', async (req, res) => {
  try {
    const { StyleId } = req.body;
    
    if (!StyleId) {
      return res.status(400).json({
        success: false,
        error: 'StyleId is required',
        message: 'Request body must contain StyleId field'
      });
    }
    
    console.log(`🔍 Geçen sezon verisi isteniyor: StyleId=${StyleId}`);
    
    const pastSeasonData = await plmStyleService.getPastSeasonData(StyleId);
    
    res.json({
      success: true,
      ...pastSeasonData
    });
    
  } catch (error) {
    console.error('Error getting past season data:', error);
    
    // Style bulunamadı
    if (error.message.includes('Style not found')) {
      return res.status(404).json({
        success: false,
        error: 'Style not found',
        message: error.message
      });
    }
    
    // Diğer hatalar
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

