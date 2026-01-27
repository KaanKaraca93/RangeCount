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
 * @desc    Range verilerinin özet istatistikleri (unpivot veriden hesaplanan)
 * @access  Public
 */
router.get('/summary', async (req, res) => {
  try {
    console.log('📊 Range V5 Summary API çağrıldı');
    
    const rangeData = await plmRangeV5Service.calculateRangeData();

    // Placeholder bazlı toplam hesapla
    const placeholderStats = {};
    rangeData.forEach(item => {
      const phId = item.placeholderId;
      if (!placeholderStats[phId]) {
        placeholderStats[phId] = {
          marka: item.marka,
          range: item.range,
          cud5Id: item.cud5Id,
          plan: item.plan,
          gerceklesen: 0
        };
      }
      if (item.gerceklesen === 1) {
        placeholderStats[phId].gerceklesen++;
      }
    });

    // Özet istatistikler
    const totalPlaceholders = Object.keys(placeholderStats).length;
    const totalPlan = Object.values(placeholderStats).filter(p => p.plan === 1).length;
    const totalGerceklesen = Object.values(placeholderStats).filter(p => p.gerceklesen > 0).length;
    const totalUnplanned = Object.values(placeholderStats).filter(p => p.plan === 0).length;

    // Marka bazlı özet
    const byMarka = {};
    Object.values(placeholderStats).forEach(item => {
      if (!byMarka[item.marka]) {
        byMarka[item.marka] = { plan: 0, gerceklesen: 0 };
      }
      if (item.plan === 1) byMarka[item.marka].plan++;
      if (item.gerceklesen > 0) byMarka[item.marka].gerceklesen++;
    });

    // Range bazlı özet
    const byRange = {};
    Object.values(placeholderStats).forEach(item => {
      if (!byRange[item.range]) {
        byRange[item.range] = { plan: 0, gerceklesen: 0 };
      }
      if (item.plan === 1) byRange[item.range].plan++;
      if (item.gerceklesen > 0) byRange[item.range].gerceklesen++;
    });

    // CUD5 bazlı özet
    const byCUD5 = {};
    Object.values(placeholderStats).forEach(item => {
      const cud5Key = item.cud5Id || 'null';
      if (!byCUD5[cud5Key]) {
        byCUD5[cud5Key] = { plan: 0, gerceklesen: 0 };
      }
      if (item.plan === 1) byCUD5[cud5Key].plan++;
      if (item.gerceklesen > 0) byCUD5[cud5Key].gerceklesen++;
    });

    res.json({
      success: true,
      summary: {
        total: {
          totalPlaceholders: totalPlaceholders,
          plan: totalPlan,
          gerceklesen: totalGerceklesen,
          unplanned: totalUnplanned,
          fark: totalGerceklesen - totalPlan,
          oran: totalPlan > 0 ? `${Math.round((totalGerceklesen / totalPlan) * 100)}%` : '0%'
        },
        byMarka: Object.keys(byMarka).map(marka => ({
          marka,
          plan: byMarka[marka].plan,
          gerceklesen: byMarka[marka].gerceklesen,
          fark: byMarka[marka].gerceklesen - byMarka[marka].plan,
          oran: byMarka[marka].plan > 0 ? `${Math.round((byMarka[marka].gerceklesen / byMarka[marka].plan) * 100)}%` : '0%'
        })),
        byRange: Object.keys(byRange).map(range => ({
          range,
          plan: byRange[range].plan,
          gerceklesen: byRange[range].gerceklesen,
          fark: byRange[range].gerceklesen - byRange[range].plan,
          oran: byRange[range].plan > 0 ? `${Math.round((byRange[range].gerceklesen / byRange[range].plan) * 100)}%` : '0%'
        })),
        byCUD5: Object.keys(byCUD5).map(cud5 => ({
          cud5Id: cud5 === 'null' ? null : parseInt(cud5),
          plan: byCUD5[cud5].plan,
          gerceklesen: byCUD5[cud5].gerceklesen,
          fark: byCUD5[cud5].gerceklesen - byCUD5[cud5].plan,
          oran: byCUD5[cud5].plan > 0 ? `${Math.round((byCUD5[cud5].gerceklesen / byCUD5[cud5].plan) * 100)}%` : '0%'
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
