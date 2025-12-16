const express = require('express');
const router = express.Router();
const tokenService = require('../services/tokenService');

/**
 * Get access token
 * This endpoint returns a valid access token (cached or new)
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
 * Get token info (without exposing the actual token)
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
 * Refresh token (force new token acquisition)
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

