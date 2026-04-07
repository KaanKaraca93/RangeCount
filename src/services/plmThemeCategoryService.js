const axios = require('axios');
const XLSX = require('xlsx');
const path = require('path');
const tokenService = require('./tokenService');
const PLM_CONFIG = require('../config/plm.config');

const EXCEL_FILE = 'RangeSayacv3_yeni_taslak.xlsx';

const EXCLUDED_THEME_IDS = new Set([1172, 1240, 1239, 1169, 1168, 1167, 1166]);

class PlmThemeCategoryService {
  constructor() {
    this.planData = [];
    this.loadPlanData();
  }

  loadPlanData() {
    try {
      const workbook = XLSX.readFile(path.join(__dirname, '../../', EXCEL_FILE));
      const ws = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);
      this.planData = rows.map(r => ({
        marka:         r['MARKA']          || '',
        brandId:       Number(r['BrandId'])        || 0,
        seasonId:      Number(r['SeasonId'])        || 0,
        faz:           r['FreeFieldThree']  || '',
        temaAdi:       r['Tema Adı']        || '',
        themeId:       Number(r['ThemeId'])         || 0,
        kategori:      r['Kategori']        || '',
        subCategoryId: Number(r['SubCategoryId'])   || 0,
        pOpt:          Number(r['Opt Say'])          || 0
      }));
      console.log(`✅ Tema-Kategori plan verisi yüklendi: ${this.planData.length} satır`);
    } catch (err) {
      console.error('❌ Excel yüklenirken hata:', err.message);
      this.planData = [];
    }
  }

  /**
   * PLM'den style + colorway verilerini çek
   * SeasonId ve BrandId filtrelerini Excel'den dinamik oluştur
   */
  async fetchStylesFromPLM() {
    const authHeader = await tokenService.getAuthorizationHeader();

    const uniqueSeasons = [...new Set(this.planData.map(r => r.seasonId))].filter(Boolean);
    const uniqueBrands  = [...new Set(this.planData.map(r => r.brandId))].filter(Boolean);

    const seasonFilter = uniqueSeasons.length === 1
      ? `SeasonId eq ${uniqueSeasons[0]}`
      : `SeasonId in (${uniqueSeasons.join(',')})`;

    const brandFilter = uniqueBrands.length === 1
      ? `BrandId eq ${uniqueBrands[0]}`
      : `BrandId in (${uniqueBrands.join(',')})`;

    const url = `${PLM_CONFIG.ionApiUrl}/${PLM_CONFIG.tenantId}/FASHIONPLM/odata2/api/odata2/Style`;
    const params = {
      '$filter': `IsDeleted eq 0 and Status ne 103 and ${brandFilter} and ${seasonFilter}`,
      '$select': 'StyleId,StyleCode,BrandId,SubCategoryId,SeasonId,Status',
      '$expand': [
        'SubCategory($select=Id,Name)',
        'Season($select=Id,Name,Code)',
        'StyleColorways($select=StyleColorwayId,Code,Name,ThemeId,FreeFieldOne,FreeFieldThree,ColorwayStatus;$filter=ColorwayStatus ne 4)'
      ].join(',')
    };

    console.log(`📞 PLM tema-kategori verisi çekiliyor... (Sezon: ${uniqueSeasons}, Marka: ${uniqueBrands})`);

    const response = await axios.get(url, {
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
      params
    });

    const styles = response.data.value || [];
    console.log(`✅ PLM'den ${styles.length} style çekildi`);
    return styles;
  }

  /**
   * Hesaplama: her plan satırı için PLM'den tOpt, gOpt ve gerçekleşen listesi üret
   */
  async calculateProgress() {
    const plmStyles = await this.fetchStylesFromPLM();

    // planKey → { tOpt, gOpt, gerceklesenler[] }
    const actuals = {};
    this.planData.forEach(p => {
      const key = this._makeKey(p.themeId, p.subCategoryId, p.seasonId, p.faz);
      actuals[key] = { tOpt: 0, gOpt: 0, gerceklesenler: [] };
    });

    for (const style of plmStyles) {
      if (!style.StyleColorways || style.StyleColorways.length === 0) continue;

      for (const cw of style.StyleColorways) {
        // 🚫 Hariç tutma kuralları
        if (!cw.ThemeId || EXCLUDED_THEME_IDS.has(cw.ThemeId)) continue;
        if (cw.ColorwayStatus === 4)                           continue;
        if (cw.FreeFieldOne !== 'B')                           continue;

        const key = this._makeKey(
          cw.ThemeId,
          style.SubCategoryId,
          style.SeasonId,
          cw.FreeFieldThree
        );

        if (!actuals[key]) continue; // planımızda yoksa atla

        if (style.Status === 1) {
          actuals[key].tOpt++;
        } else {
          actuals[key].gOpt++;
          actuals[key].gerceklesenler.push({
            styleId:        style.StyleId,
            styleCode:      style.StyleCode,
            colorwayId:     cw.StyleColorwayId,
            colorCode:      cw.Code,
            colorName:      cw.Name,
            seasonId:       style.SeasonId,
            faz:            cw.FreeFieldThree
          });
        }
      }
    }

    const results = this.planData.map(p => {
      const key  = this._makeKey(p.themeId, p.subCategoryId, p.seasonId, p.faz);
      const act  = actuals[key] || { tOpt: 0, gOpt: 0, gerceklesenler: [] };
      const fark = p.pOpt - act.gOpt;
      const oran = p.pOpt > 0 ? Math.round((act.gOpt / p.pOpt) * 100) : 0;

      return {
        marka:         p.marka,
        brandId:       p.brandId,
        seasonId:      p.seasonId,
        faz:           p.faz,
        temaAdi:       p.temaAdi,
        temaId:        p.themeId,
        kategori:      p.kategori,
        subCategoryId: p.subCategoryId,
        pOpt:          p.pOpt,
        tOpt:          act.tOpt,
        gOpt:          act.gOpt,
        fark,
        oran:          `${oran}%`,
        gerceklesenler: act.gerceklesenler
      };
    });

    return results;
  }

  /**
   * Özet istatistik — tema bazlı grupla
   */
  calculateSummary(data) {
    const byTheme = {};
    data.forEach(row => {
      const k = `${row.temaId}_${row.seasonId}_${row.faz}`;
      if (!byTheme[k]) {
        byTheme[k] = {
          temaAdi: row.temaAdi,
          temaId:  row.temaId,
          marka:   row.marka,
          seasonId: row.seasonId,
          faz:     row.faz,
          pOpt: 0, tOpt: 0, gOpt: 0
        };
      }
      byTheme[k].pOpt += row.pOpt;
      byTheme[k].tOpt += row.tOpt;
      byTheme[k].gOpt += row.gOpt;
    });

    return Object.values(byTheme).map(t => ({
      ...t,
      fark: t.pOpt - t.gOpt,
      oran: t.pOpt > 0 ? `${Math.round((t.gOpt / t.pOpt) * 100)}%` : '0%'
    }));
  }

  _makeKey(themeId, subCategoryId, seasonId, faz) {
    return `${themeId}_${subCategoryId}_${seasonId}_${(faz || '').trim().toUpperCase()}`;
  }
}

const plmThemeCategoryService = new PlmThemeCategoryService();
module.exports = plmThemeCategoryService;
