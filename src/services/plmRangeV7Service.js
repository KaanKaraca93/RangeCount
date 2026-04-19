const XLSX = require('xlsx');
const axios = require('axios');
const PLM_CONFIG = require('../config/plm.config');
const tokenService = require('./tokenService');

const EXCLUDED_THEME_IDS = new Set([1172, 1240, 1239, 1169, 1168, 1167, 1166]);

/**
 * PLM Range V7 Service
 * Rangesayacv5 mantığının devamı — farklar:
 *   - Excel: Rangesayacv7.xlsx (SeasonId + FreeFieldThree sütunları ekli)
 *   - Matching key: BrandId_SubSubCategoryId_ExtFldId_DropDownValue_CUD5Id_SeasonId_FreeFieldThree
 *   - PLM filtresi: SeasonId sabit değil, key'den match
 *   - PLM colorway: FreeFieldThree eklendi
 *   - Output: V5 ile birebir aynı + seasonId, faz
 */
class PLMRangeV7Service {
  constructor() {
    this.dropdownCache = null;
  }

  readPlanData() {
    try {
      const workbook = XLSX.readFile('Rangesayacv7.xlsx');
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      console.log(`📊 V7 Excel'den ${data.length} satır plan verisi okundu`);
      return data;
    } catch (error) {
      console.error('❌ Rangesayacv7.xlsx okuma hatası:', error.message);
      throw error;
    }
  }

  async fetchStylesFromPLM(extFldIds) {
    try {
      const authHeader = await tokenService.getAuthorizationHeader();
      const url = `${PLM_CONFIG.ionApiUrl}/${PLM_CONFIG.tenantId}/FASHIONPLM/odata2/api/odata2/Style`;

      // ExtFldId filtresi Excel'deki unique ID'lerden dinamik olarak oluştur
      const extFldFilter = extFldIds.map(id => `ExtFldId eq ${id}`).join(' or ');

      const params = {
        // SeasonId filtresi yok — matching key'e dahil edildi
        '$filter': 'IsDeleted eq 0 and Status ne 103 and status ne 1 and BrandId in (4,8) and DivisionId eq 6',
        '$select': 'StyleId,StyleCode,SeasonId',
        '$expand': [
          `styleextendedfieldvalues($select=DropdownValues,Id,ExtFldId;$filter=${extFldFilter};$expand=StyleExtendedFields($select=Name))`,
          'brand',
          'SubCategory',
          'ProductSubSubCategory',
          'UserDefinedField5',
          // FreeFieldThree eklendi (SeasonId zaten $select=StyleId,StyleCode,SeasonId ile geliyor)
          'StyleColorways($select=StyleColorwayId,Code,Name,FreeFieldOne,FreeFieldThree,ThemeId;$expand=ColorwayUserDefinedField5;$filter=ColorwayStatus ne 4)'
        ].join(',')
      };

      console.log(`📞 V7 — PLM'den style verileri çekiliyor...`);

      const response = await axios.get(url, {
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
        params
      });

      const styles = response.data.value || [];
      console.log(`✅ PLM'den ${styles.length} ürün çekildi`);
      return styles;
    } catch (error) {
      console.error('❌ V7 PLM API hatası:', error.response?.data || error.message);
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
      console.error('❌ V7 Dropdown API hatası:', error.response?.data || error.message);
      throw error;
    }
  }

  async calculateRangeData() {
    try {
      console.log('🔄 V7 Range verileri hesaplanıyor...');

      // 1. Excel'den planı oku
      const planData = this.readPlanData();

      // 2. Excel'deki unique ExtFldId'leri al (dinamik PLM filtresi için)
      const extFldIds = [...new Set(planData.map(p => p.ExtFldId).filter(Boolean))];
      console.log(`🔍 ${extFldIds.length} unique ExtFldId tespit edildi`);

      // 3. PLM'den style'ları çek
      const styles = await this.fetchStylesFromPLM(extFldIds);

      // 4. Dropdown verilerini çek
      const dropdownMap = await this.fetchDropdownData(extFldIds);

      // 5. Her plan satırını Option Say kadar çoğalt → placeholder listesi
      const placeholders = [];
      let placeholderCounter = 1;

      planData.forEach(plan => {
        const optionCount = plan['Option Say'] || 1;
        for (let i = 0; i < optionCount; i++) {
          placeholders.push({
            placeholderId: `PH${placeholderCounter}`,
            marka: plan.Marka,
            brandId: plan.BrandId,
            urunGrubu: plan['Ürün Gurbu'],
            subSubCategoryId: plan.SubSubCategoryId,
            rangeTag: plan.RangeTag,
            range: plan.Range,
            extFldId: plan.ExtFldId,
            rangeDetayi: plan['Range Detayı'],
            dropDownValue: plan.DropDownValue,
            cud5Id: plan.CUD5Id,
            seasonId: plan.SeasonId,
            faz: plan.FreeFieldThree,
            // V7 key: SeasonId ve FreeFieldThree eklendi
            key: `${plan.BrandId}_${plan.SubSubCategoryId}_${plan.ExtFldId}_${plan.DropDownValue}_${plan.CUD5Id}_${plan.SeasonId}_${plan.FreeFieldThree}`
          });
          placeholderCounter++;
        }
      });

      // 6. Colorway'leri key'e göre indexle
      const colorwayMatches = {};

      styles.forEach(style => {
        const brandId = style.Brand?.Id;
        const subSubCategoryId = style.ProductSubSubCategory?.Id;
        const styleSeasonId = style.SeasonId;
        const styleId = style.StyleId;
        const styleCode = style.StyleCode;

        if (!style.StyleColorways || style.StyleColorways.length === 0) return;

        style.StyleColorways.forEach(colorway => {
          if (colorway.FreeFieldOne !== 'B') return; // Sadece B cluster
          if (EXCLUDED_THEME_IDS.has(colorway.ThemeId)) return; // İptal tema

          const colorwayId = colorway.StyleColorwayId;
          const colorwayCode = colorway.Code;
          const colorwayName = colorway.Name;
          const cud5Id = colorway.ColorwayUserDefinedField5?.Id || null;
          const colorwayFaz = colorway.FreeFieldThree || null;

          if (!style.StyleExtendedFieldValues || style.StyleExtendedFieldValues.length === 0) return;

          style.StyleExtendedFieldValues.forEach(extField => {
            const dropdownValues = extField.DropdownValues;
            if (!dropdownValues || dropdownValues === '') return;

            const dropdownIds = dropdownValues.split(',').map(v => parseInt(v.trim()));

            dropdownIds.forEach(dropDownValue => {
              // V7 key: SeasonId ve FreeFieldThree dahil
              const key = `${brandId}_${subSubCategoryId}_${extField.ExtFldId}_${dropDownValue}_${cud5Id}_${styleSeasonId}_${colorwayFaz}`;

              if (!colorwayMatches[key]) colorwayMatches[key] = [];

              const alreadyExists = colorwayMatches[key].some(c => c.colorwayId === colorwayId);
              if (!alreadyExists) {
                colorwayMatches[key].push({ styleId, styleCode, colorwayId, colorwayCode, colorwayName });
              }
            });
          });
        });
      });

      // 7. Placeholder → Colorway eşleştirme
      const results = [];
      const usedColorways = {};

      placeholders.forEach(placeholder => {
        const matchedColorways = colorwayMatches[placeholder.key] || [];

        if (!usedColorways[placeholder.key]) usedColorways[placeholder.key] = [];

        const unusedColorway = matchedColorways.find(
          cw => !usedColorways[placeholder.key].includes(cw.colorwayId)
        );

        const base = {
          placeholderId: placeholder.placeholderId,
          marka: placeholder.marka,
          brandId: placeholder.brandId,
          urunGrubu: placeholder.urunGrubu,
          subSubCategoryId: placeholder.subSubCategoryId,
          rangeTag: placeholder.rangeTag,
          range: placeholder.range,
          extFldId: placeholder.extFldId,
          rangeDetayi: placeholder.rangeDetayi,
          dropDownValue: placeholder.dropDownValue,
          cud5Id: placeholder.cud5Id,
          seasonId: placeholder.seasonId,
          faz: placeholder.faz,
        };

        if (unusedColorway) {
          usedColorways[placeholder.key].push(unusedColorway.colorwayId);
          results.push({
            ...base,
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
            plan: 1, gerceklesen: 0,
            styleId: null, styleCode: null,
            colorwayId: null, colorwayCode: null, colorwayName: null
          });
        }
      });

      // 8. Plan dışı gerçekleşenler (Plan=0, Gerçekleşen=1)
      const plannedExtFldIds = {};
      placeholders.forEach(p => {
        const key = `${p.brandId}_${p.subSubCategoryId}`;
        if (!plannedExtFldIds[key]) plannedExtFldIds[key] = new Set();
        plannedExtFldIds[key].add(p.extFldId);
      });

      let unplannedCount = 0;
      Object.keys(colorwayMatches).forEach(key => {
        const parts = key.split('_');
        const brandId = parseInt(parts[0]);
        const subSubCategoryId = parseInt(parts[1]);
        const extFldId = parts[2];
        const dropDownValue = parseInt(parts[3]);
        const cud5Id = parts[4] === 'null' ? null : parseInt(parts[4]);
        const seasonId = parts[5] === 'null' ? null : parseInt(parts[5]);
        const faz = parts.slice(6).join('_') || null; // FreeFieldThree boşluk içerebilir

        const productKey = `${brandId}_${subSubCategoryId}`;
        if (!plannedExtFldIds[productKey] || !plannedExtFldIds[productKey].has(extFldId)) return;

        const usedCount = usedColorways[key] ? usedColorways[key].length : 0;
        const totalForKey = colorwayMatches[key].length;

        if (totalForKey > usedCount) {
          const dropdownInfo = dropdownMap[dropDownValue];
          const rangeDetayi = dropdownInfo ? dropdownInfo.name : `ID_${dropDownValue}`;

          // Etiket lookup'ları faz'a göre filtrelenir; aynı ExtFldId farklı fazda
          // farklı Range/RangeTag etiketine sahip olabildiği için faz uyuşmazsa
          // sürplus colorway'ler yanlış faz'ın etiketlerini alıyordu.
          const samplePlan = placeholders.find(p =>
            p.brandId === brandId && p.subSubCategoryId === subSubCategoryId && p.faz === faz
          ) || placeholders.find(p =>
            p.brandId === brandId && p.subSubCategoryId === subSubCategoryId
          );
          const marka = samplePlan ? samplePlan.marka : (brandId === 4 ? 'Ipekyol' : 'Twist');
          const urunGrubu = samplePlan ? samplePlan.urunGrubu : 'Unknown';

          const sampleRangeInfo = placeholders.find(p =>
            p.extFldId === extFldId &&
            p.brandId === brandId &&
            p.subSubCategoryId === subSubCategoryId &&
            p.faz === faz
          ) || placeholders.find(p =>
            p.extFldId === extFldId && p.brandId === brandId && p.subSubCategoryId === subSubCategoryId
          );
          const range = sampleRangeInfo ? sampleRangeInfo.range : 'Unknown';
          const rangeTag = sampleRangeInfo ? sampleRangeInfo.rangeTag : 'Unknown';

          colorwayMatches[key].forEach(colorway => {
            const isUsed = usedColorways[key] && usedColorways[key].includes(colorway.colorwayId);
            const alreadyInResults = results.some(r => r.colorwayId === colorway.colorwayId && r.extFldId === extFldId);

            if (!isUsed && !alreadyInResults) {
              results.push({
                placeholderId: null,
                marka, brandId, urunGrubu, subSubCategoryId,
                rangeTag, range, extFldId, rangeDetayi, dropDownValue, cud5Id,
                seasonId, faz,
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
        }
      });

      console.log(`✅ V7 toplam ${results.length} satır oluşturuldu`);
      console.log(`   Plan=1 / Gerçekleşen=1: ${results.filter(r => r.plan === 1 && r.gerceklesen === 1).length}`);
      console.log(`   Plan=1 / Gerçekleşen=0: ${results.filter(r => r.plan === 1 && r.gerceklesen === 0).length}`);
      console.log(`   Plan=0 / Gerçekleşen=1: ${unplannedCount}`);

      return results;
    } catch (error) {
      console.error('❌ V7 Range hesaplama hatası:', error.message);
      throw error;
    }
  }

  calculateSummary(data) {
    const toplam11 = data.filter(r => r.plan === 1 && r.gerceklesen === 1).length;
    const toplam10 = data.filter(r => r.plan === 1 && r.gerceklesen === 0).length;
    const toplam01 = data.filter(r => r.plan === 0 && r.gerceklesen === 1).length;
    const toplamPlan = data.reduce((s, r) => s + r.plan, 0);
    const toplamGerceklesen = data.reduce((s, r) => s + r.gerceklesen, 0);

    // Faz bazlı özet
    const fazlar = [...new Set(data.map(r => r.faz).filter(Boolean))];
    const fazBazinda = fazlar.map(faz => {
      const rows = data.filter(r => r.faz === faz);
      return {
        faz,
        toplamPlan: rows.reduce((s, r) => s + r.plan, 0),
        toplamGerceklesen: rows.reduce((s, r) => s + r.gerceklesen, 0),
        eslesen: rows.filter(r => r.plan === 1 && r.gerceklesen === 1).length,
      };
    });

    return {
      toplamPlan,
      toplamGerceklesen,
      eslesen: toplam11,
      sadecePlanlanan: toplam10,
      sadaceGerceklesen: toplam01,
      toplamKayit: data.length,
      fazBazinda,
    };
  }
}

module.exports = new PLMRangeV7Service();
