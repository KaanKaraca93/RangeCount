const express = require('express');
const router = express.Router();
const plmDClusterService = require('../services/plmDClusterService');

/**
 * @route GET /api/plm-d-cluster
 * @desc D-Cluster (FreeFieldOne='D') ürünlerinin tema ve kategori bazında sayımı
 * @returns {Object} success, count, data (SubCategory bazında AGU/EYL/EKM detayı)
 */
router.get('/plm-d-cluster', async (req, res) => {
  try {
    console.log('📊 D-Cluster hesaplama başlatılıyor...');
    
    const dClusterData = await plmDClusterService.calculateDClusterFromPLM();
    
    res.json({
      success: true,
      count: dClusterData.length,
      data: dClusterData,
      meta: {
        description: 'D-Cluster ürünleri (FreeFieldOne=D)',
        themeGroups: {
          AGU: [1118, 1119, 1120, 1125],
          EYL: [1121, 1122, 1126],
          EKM: [1123, 1124, 1127]
        },
        excludeRules: [
          'ColorwayStatus = 4 (iptal)',
          'ThemeId = 1172 (iptal)',
          'FreeFieldOne != D (sadece D cluster)'
        ]
      }
    });
    
  } catch (error) {
    console.error('❌ D-Cluster API hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
