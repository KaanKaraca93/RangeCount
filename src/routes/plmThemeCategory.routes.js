const express = require('express');
const router = express.Router();
const plmThemeCategoryService = require('../services/plmThemeCategoryService');

/**
 * GET /api/theme-category
 * Tema + Kategori bazlı plan vs gerçekleşen detayı
 * Query params:
 *   ?themeId=1293         → belirli tema filtresi
 *   ?subCategoryId=21     → belirli kategori filtresi
 *   ?seasonId=10          → sezon filtresi
 *   ?faz=SEMI+PLAN        → faz filtresi
 *   ?onlyWithPlan=true    → sadece pOpt > 0 olanlar
 */
router.get('/', async (req, res) => {
  try {
    const { themeId, subCategoryId, seasonId, faz, onlyWithPlan } = req.query;

    let data = await plmThemeCategoryService.calculateProgress();

    if (themeId)       data = data.filter(r => r.temaId        === Number(themeId));
    if (subCategoryId) data = data.filter(r => r.subCategoryId === Number(subCategoryId));
    if (seasonId)      data = data.filter(r => r.seasonId      === Number(seasonId));
    if (faz)           data = data.filter(r => r.faz.toUpperCase() === faz.toUpperCase());
    if (onlyWithPlan === 'true') data = data.filter(r => r.pOpt > 0);

    res.json({ count: data.length, data });
  } catch (err) {
    console.error('❌ theme-category hatası:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/theme-category/summary
 * Tema bazlı özet (kategori breakdown yok, sadece toplam pOpt/tOpt/gOpt)
 */
router.get('/summary', async (req, res) => {
  try {
    const { seasonId, faz } = req.query;

    let data = await plmThemeCategoryService.calculateProgress();

    if (seasonId) data = data.filter(r => r.seasonId === Number(seasonId));
    if (faz)      data = data.filter(r => r.faz.toUpperCase() === faz.toUpperCase());

    const summary = plmThemeCategoryService.calculateSummary(data);

    const toplamP = summary.reduce((s, r) => s + r.pOpt, 0);
    const toplamG = summary.reduce((s, r) => s + r.gOpt, 0);
    const toplamT = summary.reduce((s, r) => s + r.tOpt, 0);

    res.json({
      temaSayisi: summary.length,
      toplamPlanlanan: toplamP,
      toplamGerceklesen: toplamG,
      toplamTaslak: toplamT,
      genelOran: toplamP > 0 ? `${Math.round((toplamG / toplamP) * 100)}%` : '0%',
      data: summary
    });
  } catch (err) {
    console.error('❌ theme-category/summary hatası:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/theme-category/actuals
 * Gerçekleşen colorway detayı — widget için StyleId, ColorwayId, ColorCode
 * Query params: themeId, subCategoryId, seasonId, faz
 */
router.get('/actuals', async (req, res) => {
  try {
    const { themeId, subCategoryId, seasonId, faz } = req.query;

    let data = await plmThemeCategoryService.calculateProgress();

    if (themeId)       data = data.filter(r => r.temaId        === Number(themeId));
    if (subCategoryId) data = data.filter(r => r.subCategoryId === Number(subCategoryId));
    if (seasonId)      data = data.filter(r => r.seasonId      === Number(seasonId));
    if (faz)           data = data.filter(r => r.faz.toUpperCase() === faz.toUpperCase());

    const actuals = [];
    data.forEach(row => {
      row.gerceklesenler.forEach(cw => {
        actuals.push({
          temaAdi:       row.temaAdi,
          temaId:        row.temaId,
          kategori:      row.kategori,
          subCategoryId: row.subCategoryId,
          faz:           row.faz,
          ...cw
        });
      });
    });

    res.json({ count: actuals.length, data: actuals });
  } catch (err) {
    console.error('❌ theme-category/actuals hatası:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
