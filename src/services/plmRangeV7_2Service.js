const XLSX = require('xlsx');
const axios = require('axios');
const path = require('path');
const PLM_CONFIG = require('../config/plm.config');
const tokenService = require('./tokenService');

const EXCLUDED_THEME_IDS = new Set([1172, 1240, 1239, 1169, 1168, 1167, 1166]);

// Tema meta verisi (Alt_Sezon) IDM'den okunur ve nadiren değişir → PID bazlı cache.
const THEME_ALT_SEZON_TTL_MS = 30 * 60 * 1000; // 30 dakika
const themeAltSezonCache = new Map(); // themePid -> { value, loadedAt }

// LifeStyleGroup gruplaması: ColorwayUserDefinedField4.Id → kategori
//   1,2 → Mono | 8 → Business | 3 → Tema | diğer → Diğer
function lifeStyleGroupFromCud4(cud4Id) {
  const id = Number(cud4Id);
  if (id === 1 || id === 2) return 'Mono';
  if (id === 8) return 'Business';
  if (id === 3) return 'Tema';
  return 'Diğer';
}

const LIFESTYLE_GROUPS = ['Mono', 'Business', 'Tema', 'Diğer'];

// Anahtar bileşenleri için normalize ediciler (plan ve colorway tarafı aynı üretmeli)
const norm = (v) => (v === undefined || v === null || v === '') ? 'null' : String(v).trim();
const normAlt = (v) => (v === undefined || v === null || v === '') ? 'null' : String(v).trim().toUpperCase();
const normGroup = (v) => {
  const s = (v === undefined || v === null) ? '' : String(v).trim();
  return s === '' ? 'Diğer' : s;
};

/**
 * PLM Range V7.2 Service
 * V7 mantığının devamı — farklar:
 *   1. Eşleştirmede FreeFieldThree yerine Alt_Sezon (colorway teması → IDM
 *      /IDM/api/items/{Theme.Description} → attrs.attr[Alt_Sezon]).
 *   2. ProductSubSubCategory.Id yerine SubCategory.Id ile eşleştirme.
 *   3. LifeStyleGroup kırılımı (ColorwayUserDefinedField4.Id → Mono/Business/Tema/Diğer).
 *      Hem matching key'e hem özet kırılımına dahildir.
 *   - Excel: RangeSayacv7_2.xlsx
 */
class PLMRangeV7_2Service {
  constructor() {
    this.dropdownCache = null;
  }

  readPlanData() {
    try {
      const workbook = XLSX.readFile(path.join(__dirname, '../../RangeSayacv7_2.xlsx'));
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      console.log(`📊 V7.2 Excel'den ${data.length} satır plan verisi okundu`);
      return data;
    } catch (error) {
      console.error('❌ RangeSayacv7_2.xlsx okuma hatası:', error.message);
      throw error;
    }
  }

  // ── IDM Alt_Sezon çözümü ──────────────────────────────────────────────
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

    console.log(`🎨 V7.2 — ${pids.size} benzersiz tema için IDM Alt_Sezon çekiliyor...`);
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

  // ── PLM verisi ────────────────────────────────────────────────────────
  async fetchStylesFromPLM(extFldIds) {
    try {
      const authHeader = await tokenService.getAuthorizationHeader();
      const url = `${PLM_CONFIG.ionApiUrl}/${PLM_CONFIG.tenantId}/FASHIONPLM/odata2/api/odata2/Style`;

      const extFldFilter = extFldIds.map(id => `ExtFldId eq ${id}`).join(' or ');

      const params = {
        '$filter': 'IsDeleted eq 0 and Status ne 103 and status ne 1 and BrandId in (4,8) and DivisionId eq 6',
        '$select': 'StyleId,StyleCode,SeasonId',
        '$expand': [
          `styleextendedfieldvalues($select=DropdownValues,Id,ExtFldId;$filter=${extFldFilter};$expand=StyleExtendedFields($select=Name))`,
          'brand',
          'SubCategory',
          'UserDefinedField5',
          // Theme($select=Id,Description) → IDM PID (Alt_Sezon), ColorwayUserDefinedField4 → LifeStyleGroup
          'StyleColorways($select=StyleColorwayId,Code,Name,FreeFieldOne,ThemeId;$expand=ColorwayUserDefinedField4,ColorwayUserDefinedField5,Theme($select=Id,Description);$filter=ColorwayStatus ne 4)'
        ].join(',')
      };

      console.log(`📞 V7.2 — PLM'den style verileri çekiliyor...`);

      const response = await axios.get(url, {
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
        params
      });

      const styles = response.data.value || [];
      console.log(`✅ PLM'den ${styles.length} ürün çekildi`);
      return styles;
    } catch (error) {
      console.error('❌ V7.2 PLM API hatası:', error.response?.data || error.message);
      throw error;
    }
  }

  async fetchDropdownData(extFldIds) {
    if (this.dropdownCache) return this.dropdownCache;

    try {
      const authHeader = await tokenService.getAuthorizationHeader();
      const url = `${PLM_CONFIG.ionApiUrl}/${PLM_CONFIG.tenantId}/FASHIONPLM/odata2/api/odata2/ExtendedFieldDropDown`;

      const extFldFilter = extFldIds.map(id => `ExtFldId eq ${id}`).join(' or ');

      const response = await axios.get(url, {
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
        params: { '$filter': extFldFilter }
      });

      const dropdownMap = {};
      response.data.value.forEach(item => {
        dropdownMap[item.ExtFldDropDownId] = {
          id: item.ExtFldDropDownId,
          name: item.Name,
          extFldId: item.ExtFldId
        };
      });

      this.dropdownCache = dropdownMap;
      console.log(`✅ ${Object.keys(dropdownMap).length} dropdown değeri cache'lendi`);
      return dropdownMap;
    } catch (error) {
      console.error('❌ V7.2 Dropdown API hatası:', error.response?.data || error.message);
      throw error;
    }
  }

  makeKey(brandId, subCategoryId, extFldId, dropDownValue, cud5Id, seasonId, altSezon, lifeStyleGroup) {
    return [
      norm(brandId), norm(subCategoryId), norm(extFldId), norm(dropDownValue),
      norm(cud5Id), norm(seasonId), normAlt(altSezon), normGroup(lifeStyleGroup)
    ].join('_');
  }

  async calculateRangeData() {
    try {
      console.log('🔄 V7.2 Range verileri hesaplanıyor...');

      const planData = this.readPlanData();

      const extFldIds = [...new Set(planData.map(p => p.ExtFldId).filter(Boolean))];
      console.log(`🔍 ${extFldIds.length} unique ExtFldId tespit edildi`);

      const styles = await this.fetchStylesFromPLM(extFldIds);
      await this.annotateAltSezon(styles);
      const dropdownMap = await this.fetchDropdownData(extFldIds);

      // Her plan satırını Option Say kadar çoğalt → placeholder listesi
      const placeholders = [];
      let placeholderCounter = 1;

      planData.forEach(plan => {
        const optionCount = plan['Option Say'] || 1;
        const lifeStyleGroup = normGroup(plan['Life Style Grup']);
        for (let i = 0; i < optionCount; i++) {
          placeholders.push({
            placeholderId: `PH${placeholderCounter}`,
            marka: plan.Marka,
            brandId: plan.BrandId,
            urunGrubu: plan['Ürün Gurbu'],
            // V7.2: SubCategoryId ile çalışıyoruz
            subCategoryId: plan.SubCategoryId,
            rangeTag: plan.RangeTag,
            range: plan.Range,
            extFldId: plan.ExtFldId,
            rangeDetayi: plan['Range Detayı'],
            dropDownValue: plan.DropDownValue,
            cud5Id: plan.CUD5Id,
            seasonId: plan.SeasonId,
            altSezon: plan.Alt_Sezon,
            lifeStyleGroup,
            key: this.makeKey(plan.BrandId, plan.SubCategoryId, plan.ExtFldId, plan.DropDownValue, plan.CUD5Id, plan.SeasonId, plan.Alt_Sezon, lifeStyleGroup)
          });
          placeholderCounter++;
        }
      });

      // Colorway'leri key'e göre indexle (meta + items)
      const colorwayMatches = {}; // key -> { meta, items: [] }

      styles.forEach(style => {
        const brandId = style.Brand?.Id;
        const subCategoryId = style.SubCategory?.Id;
        const styleSeasonId = style.SeasonId;
        const styleId = style.StyleId;
        const styleCode = style.StyleCode;

        if (!style.StyleColorways || style.StyleColorways.length === 0) return;

        style.StyleColorways.forEach(colorway => {
          if (colorway.FreeFieldOne !== 'B') return;              // Sadece B cluster
          if (EXCLUDED_THEME_IDS.has(colorway.ThemeId)) return;   // İptal tema

          const colorwayId = colorway.StyleColorwayId;
          const colorwayCode = colorway.Code;
          const colorwayName = colorway.Name;
          const cud5Id = colorway.ColorwayUserDefinedField5?.Id || null;
          const cud4Id = colorway.ColorwayUserDefinedField4?.Id ?? null;
          const lifeStyleGroup = lifeStyleGroupFromCud4(cud4Id);
          const colorwayAltSezon = colorway.altSezon || null;

          if (!style.StyleExtendedFieldValues || style.StyleExtendedFieldValues.length === 0) return;

          style.StyleExtendedFieldValues.forEach(extField => {
            const dropdownValues = extField.DropdownValues;
            if (!dropdownValues || dropdownValues === '') return;

            const dropdownIds = dropdownValues.split(',').map(v => parseInt(v.trim()));

            dropdownIds.forEach(dropDownValue => {
              const key = this.makeKey(brandId, subCategoryId, extField.ExtFldId, dropDownValue, cud5Id, styleSeasonId, colorwayAltSezon, lifeStyleGroup);

              if (!colorwayMatches[key]) {
                colorwayMatches[key] = {
                  meta: {
                    brandId, subCategoryId, extFldId: extField.ExtFldId,
                    dropDownValue, cud5Id, seasonId: styleSeasonId,
                    altSezon: colorwayAltSezon, lifeStyleGroup
                  },
                  items: []
                };
              }

              const alreadyExists = colorwayMatches[key].items.some(c => c.colorwayId === colorwayId);
              if (!alreadyExists) {
                colorwayMatches[key].items.push({ styleId, styleCode, colorwayId, colorwayCode, colorwayName, cud4Id, lifeStyleGroup });
              }
            });
          });
        });
      });

      // Placeholder → Colorway eşleştirme
      const results = [];
      const usedColorways = {};

      placeholders.forEach(placeholder => {
        const bucket = colorwayMatches[placeholder.key];
        const matchedColorways = bucket ? bucket.items : [];

        if (!usedColorways[placeholder.key]) usedColorways[placeholder.key] = [];

        const unusedColorway = matchedColorways.find(
          cw => !usedColorways[placeholder.key].includes(cw.colorwayId)
        );

        const base = {
          placeholderId: placeholder.placeholderId,
          marka: placeholder.marka,
          brandId: placeholder.brandId,
          urunGrubu: placeholder.urunGrubu,
          subCategoryId: placeholder.subCategoryId,
          rangeTag: placeholder.rangeTag,
          range: placeholder.range,
          extFldId: placeholder.extFldId,
          rangeDetayi: placeholder.rangeDetayi,
          dropDownValue: placeholder.dropDownValue,
          cud5Id: placeholder.cud5Id,
          seasonId: placeholder.seasonId,
          altSezon: placeholder.altSezon,
          lifeStyleGroup: placeholder.lifeStyleGroup,
        };

        if (unusedColorway) {
          usedColorways[placeholder.key].push(unusedColorway.colorwayId);
          results.push({
            ...base,
            lifeStyleGroupId: unusedColorway.cud4Id,
            plan: 1, gerceklesen: 1,
            styleId: unusedColorway.styleId,
            styleCode: unusedColorway.styleCode,
            colorwayId: unusedColorway.colorwayId,
            colorwayCode: unusedColorway.colorwayCode,
            colorwayName: unusedColorway.colorwayName
          });
        } else {
          results.push({
            ...base,
            lifeStyleGroupId: null,
            plan: 1, gerceklesen: 0,
            styleId: null, styleCode: null,
            colorwayId: null, colorwayCode: null, colorwayName: null
          });
        }
      });

      // Plan dışı gerçekleşenler (Plan=0, Gerçekleşen=1)
      const plannedExtFldIds = {}; // brandId_subCategoryId -> Set(extFldId)
      placeholders.forEach(p => {
        const k = `${norm(p.brandId)}_${norm(p.subCategoryId)}`;
        if (!plannedExtFldIds[k]) plannedExtFldIds[k] = new Set();
        plannedExtFldIds[k].add(p.extFldId);
      });

      let unplannedCount = 0;
      Object.keys(colorwayMatches).forEach(key => {
        const { meta, items } = colorwayMatches[key];
        const { brandId, subCategoryId, extFldId, dropDownValue, seasonId, altSezon, lifeStyleGroup } = meta;
        const cud5Id = meta.cud5Id;

        const productKey = `${norm(brandId)}_${norm(subCategoryId)}`;
        if (!plannedExtFldIds[productKey] || !plannedExtFldIds[productKey].has(extFldId)) return;

        const usedCount = usedColorways[key] ? usedColorways[key].length : 0;
        const totalForKey = items.length;
        if (totalForKey <= usedCount) return;

        const dropdownInfo = dropdownMap[dropDownValue];
        const rangeDetayi = dropdownInfo ? dropdownInfo.name : `ID_${dropDownValue}`;

        // Etiketleri (marka, urunGrubu, range, rangeTag) aynı kırılımdaki plandan al
        const samplePlan = placeholders.find(p =>
          p.brandId === brandId && p.subCategoryId === subCategoryId && p.lifeStyleGroup === lifeStyleGroup
        ) || placeholders.find(p =>
          p.brandId === brandId && p.subCategoryId === subCategoryId
        );
        const marka = samplePlan ? samplePlan.marka : (brandId === 4 ? 'Ipekyol' : 'Twist');
        const urunGrubu = samplePlan ? samplePlan.urunGrubu : 'Unknown';

        const sampleRangeInfo = placeholders.find(p =>
          p.extFldId === extFldId && p.brandId === brandId &&
          p.subCategoryId === subCategoryId && p.lifeStyleGroup === lifeStyleGroup
        ) || placeholders.find(p =>
          p.extFldId === extFldId && p.brandId === brandId && p.subCategoryId === subCategoryId
        );
        const range = sampleRangeInfo ? sampleRangeInfo.range : 'Unknown';
        const rangeTag = sampleRangeInfo ? sampleRangeInfo.rangeTag : 'Unknown';

        items.forEach(colorway => {
          const isUsed = usedColorways[key] && usedColorways[key].includes(colorway.colorwayId);
          const alreadyInResults = results.some(r => r.colorwayId === colorway.colorwayId && r.extFldId === extFldId);

          if (!isUsed && !alreadyInResults) {
            results.push({
              placeholderId: null,
              marka, brandId, urunGrubu, subCategoryId,
              rangeTag, range, extFldId, rangeDetayi, dropDownValue, cud5Id,
              seasonId, altSezon, lifeStyleGroup,
              lifeStyleGroupId: colorway.cud4Id,
              plan: 0, gerceklesen: 1,
              styleId: colorway.styleId,
              styleCode: colorway.styleCode,
              colorwayId: colorway.colorwayId,
              colorwayCode: colorway.colorwayCode,
              colorwayName: colorway.colorwayName
            });
            unplannedCount++;
          }
        });
      });

      console.log(`✅ V7.2 toplam ${results.length} satır oluşturuldu`);
      console.log(`   Plan=1 / Gerçekleşen=1: ${results.filter(r => r.plan === 1 && r.gerceklesen === 1).length}`);
      console.log(`   Plan=1 / Gerçekleşen=0: ${results.filter(r => r.plan === 1 && r.gerceklesen === 0).length}`);
      console.log(`   Plan=0 / Gerçekleşen=1: ${unplannedCount}`);

      return results;
    } catch (error) {
      console.error('❌ V7.2 Range hesaplama hatası:', error.message);
      throw error;
    }
  }

  calculateSummary(data) {
    const toplam11 = data.filter(r => r.plan === 1 && r.gerceklesen === 1).length;
    const toplam10 = data.filter(r => r.plan === 1 && r.gerceklesen === 0).length;
    const toplam01 = data.filter(r => r.plan === 0 && r.gerceklesen === 1).length;
    const toplamPlan = data.reduce((s, r) => s + r.plan, 0);
    const toplamGerceklesen = data.reduce((s, r) => s + r.gerceklesen, 0);

    // LifeStyleGroup bazlı özet (Mono/Business/Tema/Diğer + veride görülen diğerleri)
    const gruplar = [...new Set([...LIFESTYLE_GROUPS, ...data.map(r => r.lifeStyleGroup).filter(Boolean)])];
    const grupBazinda = gruplar.map(grup => {
      const rows = data.filter(r => r.lifeStyleGroup === grup);
      return {
        lifeStyleGroup: grup,
        toplamPlan: rows.reduce((s, r) => s + r.plan, 0),
        toplamGerceklesen: rows.reduce((s, r) => s + r.gerceklesen, 0),
        eslesen: rows.filter(r => r.plan === 1 && r.gerceklesen === 1).length,
        sadecePlanlanan: rows.filter(r => r.plan === 1 && r.gerceklesen === 0).length,
        sadaceGerceklesen: rows.filter(r => r.plan === 0 && r.gerceklesen === 1).length,
      };
    });

    return {
      toplamPlan,
      toplamGerceklesen,
      eslesen: toplam11,
      sadecePlanlanan: toplam10,
      sadaceGerceklesen: toplam01,
      toplamKayit: data.length,
      grupBazinda,
    };
  }
}

module.exports = new PLMRangeV7_2Service();
