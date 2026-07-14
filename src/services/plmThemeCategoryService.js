const axios = require('axios');
const XLSX = require('xlsx');
const path = require('path');
const tokenService = require('./tokenService');
const PLM_CONFIG = require('../config/plm.config');

const EXCEL_FILE = 'RangeSayacv3_yeni_taslakv2.xlsx';

const EXCLUDED_THEME_IDS = new Set([1172, 1240, 1239, 1169, 1168, 1167, 1166]);

// Tema meta verisi (Alt_Sezon) IDM'den okunur ve nadiren değişir → PID bazlı cache.
const THEME_ALT_SEZON_TTL_MS = 30 * 60 * 1000; // 30 dakika
const themeAltSezonCache = new Map(); // themePid -> { value, loadedAt }

// Anahtar bileşeni için normalize edici (plan ve colorway aynı üretmeli)
const normAltSezon = (v) => (v === undefined || v === null || v === '') ? '' : String(v).trim().toUpperCase();

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
        // Sezon 11 itibarıyla eşleştirme FreeFieldThree yerine Alt_Sezon ile yapılıyor.
        // Alt_Sezon PLM'de doğrudan yok; colorway temasının PID'sinden (Theme.Description)
        // IDM /IDM/api/items/{pid} → attrs.attr[Alt_Sezon] üzerinden çözülür.
        altSezon:      r['Alt_Sezon']       || '',
        temaAdi:       r['Tema Adı']        || '',
        // ThemeId boş/null olabilir (tema henüz tam açılmamış). Bu satırlar
        // eşleştirmeye girmemeli; bu yüzden 0'a düşürmek yerine null bırakıyoruz.
        themeId:       this._parseThemeId(r['ThemeId']),
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

  // ── IDM Alt_Sezon çözümü (v6.2/v7.2 ile aynı mantık) ──────────────────
  async fetchAltSezon(themePid) {
    if (!themePid) return null;

    const cached = themeAltSezonCache.get(themePid);
    if (cached && (Date.now() - cached.loadedAt) < THEME_ALT_SEZON_TTL_MS) {
      return cached.value;
    }

    try {
      const authHeader = await tokenService.getAuthorizationHeader();
      const url = `${PLM_CONFIG.ionApiUrl}/${PLM_CONFIG.tenantId}/IDM/api/items/${encodeURIComponent(themePid)}`;
      const response = await axios.get(url, {
        headers: { 'Authorization': authHeader, 'Accept': 'application/json' }
      });

      const attrs = response?.data?.item?.attrs?.attr || [];
      const found = attrs.find(a => a && (a.name === 'Alt_Sezon' || a.qual === 'Alt_Sezon'));
      const value = found && found.value != null ? String(found.value) : null;

      themeAltSezonCache.set(themePid, { value, loadedAt: Date.now() });
      return value;
    } catch (error) {
      console.error(`❌ IDM Alt_Sezon okunamadı (${themePid}): ${error.message}`);
      return null;
    }
  }

  async loadAltSezonMap(pids, concurrency = 5) {
    const map = {};
    let cursor = 0;
    const worker = async () => {
      while (cursor < pids.length) {
        const pid = pids[cursor++];
        map[pid] = await this.fetchAltSezon(pid);
      }
    };
    const workerCount = Math.min(concurrency, pids.length) || 0;
    await Promise.all(Array.from({ length: workerCount }, worker));
    return map;
  }

  // Colorway'lere altSezon bilgisini (tema PID → IDM) iliştirir.
  async annotateAltSezon(styles) {
    const pids = new Set();
    styles.forEach(style => {
      (style.StyleColorways || []).forEach(cw => {
        if (!cw) return;
        const theme = cw.Theme || cw.theme;
        const pid = theme ? theme.Description : null;
        if (pid) pids.add(pid);
      });
    });

    console.log(`🎨 Tema-Kategori — ${pids.size} benzersiz tema için IDM Alt_Sezon çekiliyor...`);
    const altSezonMap = await this.loadAltSezonMap([...pids]);

    styles.forEach(style => {
      (style.StyleColorways || []).forEach(cw => {
        if (!cw) return;
        const theme = cw.Theme || cw.theme;
        const pid = theme ? theme.Description : null;
        cw.altSezon = pid ? (altSezonMap[pid] || null) : null;
      });
    });
  }

  /**
   * PLM'den style + colorway verilerini çek
   * SeasonId ve BrandId filtrelerini Excel'den dinamik oluştur
   */
  async fetchStylesFromPLM() {
    const authHeader = await tokenService.getAuthorizationHeader();

    const uniqueSeasons = [...new Set(this.planData.map(r => r.seasonId))].filter(Boolean);
    const uniqueBrands  = [...new Set(this.planData.map(r => r.brandId))].filter(Boolean);

    if (uniqueSeasons.length === 0 || uniqueBrands.length === 0) {
      console.warn('⚠️ Geçerli SeasonId/BrandId bulunamadı — PLM sorgusu atlanıyor, boş sonuç dönülüyor.');
      return [];
    }

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
        // Theme($select=Id,Description) → Description = IDM PID (Alt_Sezon için)
        'StyleColorways($select=StyleColorwayId,Code,Name,ThemeId,FreeFieldOne,FreeFieldThree,ColorwayStatus;$expand=Theme($select=Id,Description);$filter=ColorwayStatus ne 4)'
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

    // Colorway'lere tema PID'sinden Alt_Sezon'u çöz ve iliştir (eşleştirme bununla yapılır).
    await this.annotateAltSezon(plmStyles);

    // planKey → { tOpt, gOpt, gerceklesenler[] }
    const actuals = {};
    this.planData.forEach(p => {
      // ThemeId boşsa hesaplama beklenmiyor; anahtar üretme (eşleşme aramaz,
      // çıktıda gOpt=0 olarak görünür).
      if (!p.themeId) return;
      const key = this._makeKey(p.themeId, p.subCategoryId, p.seasonId, p.altSezon);
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
          cw.altSezon
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
            faz:            cw.FreeFieldThree,
            altSezon:       cw.altSezon || null
          });
        }
      }
    }

    const results = this.planData.map(p => {
      const key  = this._makeKey(p.themeId, p.subCategoryId, p.seasonId, p.altSezon);
      const act  = actuals[key] || { tOpt: 0, gOpt: 0, gerceklesenler: [] };
      const fark = p.pOpt - act.gOpt;
      const oran = p.pOpt > 0 ? Math.round((act.gOpt / p.pOpt) * 100) : 0;

      return {
        marka:         p.marka,
        brandId:       p.brandId,
        seasonId:      p.seasonId,
        faz:           p.faz,
        altSezon:      p.altSezon,
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
      const k = `${row.temaId}_${row.seasonId}_${normAltSezon(row.altSezon)}`;
      if (!byTheme[k]) {
        byTheme[k] = {
          temaAdi: row.temaAdi,
          temaId:  row.temaId,
          marka:   row.marka,
          seasonId: row.seasonId,
          faz:     row.faz,
          altSezon: row.altSezon,
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

  _parseThemeId(value) {
    if (value === undefined || value === null || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  _makeKey(themeId, subCategoryId, seasonId, altSezon) {
    return `${themeId}_${subCategoryId}_${seasonId}_${normAltSezon(altSezon)}`;
  }
}

const plmThemeCategoryService = new PlmThemeCategoryService();
module.exports = plmThemeCategoryService;
