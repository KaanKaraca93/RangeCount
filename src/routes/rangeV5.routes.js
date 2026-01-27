const express = require('express');
const router = express.Router();
const plmRangeV5Service = require('../services/plmRangeV5Service');

/**
 * @route   GET /api/range-v5
 * @desc    Range özellik takibi - RangeSayacv5.xlsx bazlı
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    console.log('📊 Range V5 API çağrıldı');
    
    const rangeData = await plmRangeV5Service.calculateRangeData();

    res.json({
      success: true,
      count: rangeData.length,
      data: rangeData
    });
  } catch (error) {
    console.error('❌ Range V5 API hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Range verileri hesaplanırken bir hata oluştu',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/range-v5/summary
 * @desc    Range verilerinin özet istatistikleri
 * @access  Public
 */
router.get('/summary', async (req, res) => {
  try {
    console.log('📊 Range V5 Summary API çağrıldı');
    
    const rangeData = await plmRangeV5Service.calculateRangeData();

    // Özet istatistikler
    const totalPOpt = rangeData.reduce((sum, item) => sum + item.pOpt, 0);
    const totalGOpt = rangeData.reduce((sum, item) => sum + item.gOpt, 0);
    const totalFark = totalGOpt - totalPOpt;
    const oran = totalPOpt > 0 ? Math.round((totalGOpt / totalPOpt) * 100) : 0;

    // Marka bazlı özet
    const byMarka = {};
    rangeData.forEach(item => {
      if (!byMarka[item.marka]) {
        byMarka[item.marka] = { pOpt: 0, gOpt: 0 };
      }
      byMarka[item.marka].pOpt += item.pOpt;
      byMarka[item.marka].gOpt += item.gOpt;
    });

    // Range bazlı özet
    const byRange = {};
    rangeData.forEach(item => {
      if (!byRange[item.range]) {
        byRange[item.range] = { pOpt: 0, gOpt: 0 };
      }
      byRange[item.range].pOpt += item.pOpt;
      byRange[item.range].gOpt += item.gOpt;
    });

    // CUD5 bazlı özet
    const byCUD5 = {};
    rangeData.forEach(item => {
      const cud5Key = item.cud5Id || 'null';
      if (!byCUD5[cud5Key]) {
        byCUD5[cud5Key] = { pOpt: 0, gOpt: 0 };
      }
      byCUD5[cud5Key].pOpt += item.pOpt;
      byCUD5[cud5Key].gOpt += item.gOpt;
    });

    res.json({
      success: true,
      summary: {
        total: {
          pOpt: totalPOpt,
          gOpt: totalGOpt,
          fark: totalFark,
          oran: `${oran}%`
        },
        byMarka: Object.keys(byMarka).map(marka => ({
          marka,
          pOpt: byMarka[marka].pOpt,
          gOpt: byMarka[marka].gOpt,
          fark: byMarka[marka].gOpt - byMarka[marka].pOpt,
          oran: `${byMarka[marka].pOpt > 0 ? Math.round((byMarka[marka].gOpt / byMarka[marka].pOpt) * 100) : 0}%`
        })),
        byRange: Object.keys(byRange).map(range => ({
          range,
          pOpt: byRange[range].pOpt,
          gOpt: byRange[range].gOpt,
          fark: byRange[range].gOpt - byRange[range].pOpt,
          oran: `${byRange[range].pOpt > 0 ? Math.round((byRange[range].gOpt / byRange[range].pOpt) * 100) : 0}%`
        })),
        byCUD5: Object.keys(byCUD5).map(cud5 => ({
          cud5Id: cud5 === 'null' ? null : parseInt(cud5),
          pOpt: byCUD5[cud5].pOpt,
          gOpt: byCUD5[cud5].gOpt,
          fark: byCUD5[cud5].gOpt - byCUD5[cud5].pOpt,
          oran: `${byCUD5[cud5].pOpt > 0 ? Math.round((byCUD5[cud5].gOpt / byCUD5[cud5].pOpt) * 100) : 0}%`
        }))
      }
    });
  } catch (error) {
    console.error('❌ Range V5 Summary API hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Özet veriler hesaplanırken bir hata oluştu',
      message: error.message
    });
  }
});

module.exports = router;
