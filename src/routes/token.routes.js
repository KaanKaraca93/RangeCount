const express = require('express');
const router = express.Router();
const tokenService = require('../services/tokenService');

/**
 * @swagger
 * /api/token:
 *   get:
 *     summary: PLM Access Token Al
 *     description: Infor PLM/ION API için geçerli bir OAuth2.0 access token döndürür. Token cache'lenir ve otomatik yenilenir.
 *     tags: [Token]
 *     responses:
 *       200:
 *         description: Başarılı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenResponse'
 *       500:
 *         description: Token alınamadı
 */
router.get('/token', async (req, res) => {
  try {
    const token = await tokenService.getAccessToken();
    const tokenInfo = tokenService.getTokenInfo();
    
    res.json({
      success: true,
      accessToken: token,
      tokenType: tokenInfo.tokenType,
      expiresAt: tokenInfo.expiryTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting token:', error);
    res.status(500).json({
      error: 'Failed to acquire token',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/token/info:
 *   get:
 *     summary: Token Bilgisi
 *     description: Token durumu ve geçerlilik bilgilerini döndürür (token değerini göstermeden)
 *     tags: [Token]
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
 *                 tokenInfo:
 *                   type: object
 *                   properties:
 *                     hasToken:
 *                       type: boolean
 *                     isValid:
 *                       type: boolean
 *                     expiryTime:
 *                       type: string
 *                       format: date-time
 *                     tokenType:
 *                       type: string
 */
router.get('/token/info', async (req, res) => {
  try {
    const tokenInfo = tokenService.getTokenInfo();
    
    res.json({
      success: true,
      tokenInfo: tokenInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting token info:', error);
    res.status(500).json({
      error: 'Failed to get token info',
      message: error.message
    });
  }
});

/**
 * Revoke current token
 */
router.post('/token/revoke', async (req, res) => {
  try {
    await tokenService.revokeToken();
    
    res.json({
      success: true,
      message: 'Token revoked successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error revoking token:', error);
    res.status(500).json({
      error: 'Failed to revoke token',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/token/refresh:
 *   post:
 *     summary: Token Yenile
 *     description: Mevcut token'ı iptal edip yeni token alır (force refresh)
 *     tags: [Token]
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
 *                 accessToken:
 *                   type: string
 *                 tokenType:
 *                   type: string
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 */
router.post('/token/refresh', async (req, res) => {
  try {
    // First revoke current token if exists
    if (tokenService.getTokenInfo().hasToken) {
      await tokenService.revokeToken();
    }
    
    // Fetch new token
    const token = await tokenService.getAccessToken();
    const tokenInfo = tokenService.getTokenInfo();
    
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      accessToken: token,
      tokenType: tokenInfo.tokenType,
      expiresAt: tokenInfo.expiryTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({
      error: 'Failed to refresh token',
      message: error.message
    });
  }
});

module.exports = router;

