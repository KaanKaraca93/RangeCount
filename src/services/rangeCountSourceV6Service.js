const XLSX = require('xlsx');
const axios = require('axios');
const path = require('path');
const tokenService = require('./tokenService');
const PLM_CONFIG = require('../config/plm.config');

const FASHION_PYRAMID_LOOKUP = {
  1: "İMAGE", 2: "FARKLI", 4: "NORMAL", 5: "ÇOK FARKLI",
  6: "Essentials", 7: "Basics", 8: "Fashion Core",
  9: "Fashion Newness", 10: "Fashion Wow", 11: "Styling Core",
  12: "Twist Signature", 13: "Twist Fashion", 14: "Iconic / Hero"
};

/**
 * Range Count Source V6 Service
 * Eski sistemle aynı (ID bazlı Excel), farklar:
 *   - Excel: RangeSayacv6.xlsx (SeasonId + FreeFieldThree sütunları ekli)
 *   - Matching: SeasonId ve FreeFieldThree de eşleştirme kriterine dahil
 *   - PLM filtresi: SeasonId sabit değil, Excel'deki SeasonId'lerden match
 *   - Output: /api/range-count-source ile birebir aynı format
 */
class RangeCountSourceV6Service {
  constructor() {
    this.placeholders = [];
    this.loadPlanData();
  }

  loadPlanData() {
    try {
      const workbook = XLSX.readFile(path.join(__dirname, '../../RangeSayacv6.xlsx'));
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      this.placeholders = XLSX.utils.sheet_to_json(worksheet);
      console.log(`✅ V6 Placeholder planı yüklendi: ${this.placeholders.length} satır`);
    } catch (error) {
      console.error('❌ RangeSayacv6.xlsx yüklenirken hata:', error.message);
      this.placeholders = [];
    }
  }

  async fetchStylesFromPLM() {
    try {
      const authHeader = await tokenService.getAuthorizationHeader();
      const url = `${PLM_CONFIG.ionApiUrl}/${PLM_CONFIG.tenantId}/FASHIONPLM/odata2/api/odata2/Style`;

      const params = {
        // SeasonId filtresi yok — Excel'deki SeasonId ile matching yapılıyor
        '$filter': 'IsDeleted eq 0 and Status ne 103 and Status ne 1 and BrandId in (4,8) and DivisionId eq 6',
        '$select': 'StyleId,StyleCode,SeasonId,NumericValue1,Quantity',
        '$expand': [
          'MarketField3',
          'Brand',
          'SubCategory',
          'ProductSubSubCategory',
          'UserDefinedField5',
          // FreeFieldThree eklendi (Faz alanı), CUD5 korundu
          'StyleColorways($select=StyleColorwayId,Code,Name,ColorwayUserField1,FreeFieldOne,FreeFieldFive,FreeFieldThree;$expand=ColorwayUserDefinedField4,ColorwayUserDefinedField5;$filter=ColorwayStatus ne 4)',
          'StyleExtendedFieldValues($select=StyleId,Id,ExtFldId,NumberValue,CheckboxValue;$filter=ExtFldId eq a21b2b14-8ca3-49f2-8e80-b12823bf14a2 or ExtFldId eq 79cb5b20-3028-44d4-a85e-ed18c00af3c8;$orderby=ExtFldId;$expand=StyleExtendedFields($select=Name))'
        ].join(',')
      };

      console.log(`📞 V6 — PLM'den style verileri çekiliyor...`);

      const response = await axios.get(url, {
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
        params
      });

      const styles = response.data.value || [];
      console.log(`✅ PLM'den ${styles.length} style çekildi`);

      let totalColorways = 0;
      styles.forEach(s => { totalColorways += s.StyleColorways?.length || 0; });
      console.log(`📊 Toplam ${totalColorways} colorway bulundu`);

      return styles;
    } catch (error) {
      console.error('❌ PLM isteği hatası:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data).substring(0, 500));
      }
      throw error;
    }
  }

  getExtendedFieldValue(style, extFldId) {
    if (!style.StyleExtendedFieldValues || !Array.isArray(style.StyleExtendedFieldValues)) return null;
    const field = style.StyleExtendedFieldValues.find(f => f.ExtFldId === extFldId);
    if (!field || !field.NumberValue) return null;
    const value = typeof field.NumberValue === 'string' ? parseFloat(field.NumberValue) : field.NumberValue;
    return value;
  }

  matchPlaceholder(placeholder, style, colorway) {
    // Sadece B cluster
    if (colorway.FreeFieldOne !== 'B') return false;

    // ── Eski kriterler ──────────────────────────────────
    if (!(style.Brand && style.Brand.Id === placeholder.BrandId)) return false;
    if (!(style.SubCategory && style.SubCategory.Id === placeholder.SubCategoryId)) return false;
    if (!(style.ProductSubSubCategory && style.ProductSubSubCategory.Id === placeholder.SubSubCategoryId)) return false;
    if (colorway.ColorwayUserField1 !== placeholder.CUD1) return false;
    if (!(colorway.ColorwayUserDefinedField4 && colorway.ColorwayUserDefinedField4.Id === placeholder.CUD4)) return false;
    if (!(colorway.ColorwayUserDefinedField5 && colorway.ColorwayUserDefinedField5.Id === placeholder.CUD5)) return false;
    if (!(style.UserDefinedField5 && style.UserDefinedField5.Id === placeholder.UDF5Id)) return false;

    // ── Yeni kriterler (V6) ─────────────────────────────
    if (style.SeasonId !== placeholder.SeasonId) return false;
    if ((colorway.FreeFieldThree || null) !== (placeholder.FreeFieldThree || null)) return false;

    return true;
  }

  async matchColorwaysToPlaceholders() {
    try {
      const plmStyles = await this.fetchStylesFromPLM();

      const results = [];
      const matchedColorwayIds = new Set();

      console.log(`\n🔄 ${this.placeholders.length} placeholder için eşleştirme yapılıyor...`);

      for (const placeholder of this.placeholders) {
        const matchedColorways = [];
        let foundMatch = false;

        for (const style of plmStyles) {
          if (foundMatch) break;
          if (!style.StyleColorways || !Array.isArray(style.StyleColorways)) continue;

          for (const colorway of style.StyleColorways) {
            if (!colorway) continue;
            if (matchedColorwayIds.has(colorway.StyleColorwayId)) continue;

            if (this.matchPlaceholder(placeholder, style, colorway)) {
              matchedColorways.push({
                styleCode: style.StyleCode,
                colorwayCode: colorway.Code,
                colorwayName: colorway.Name,
                freeFieldFive: colorway.FreeFieldFive || null,
                styleColorwayId: colorway.StyleColorwayId,
                psf: style.MarketField3 ? style.MarketField3.Name : null,
                onAdet: style.NumericValue1 || null,
                planlananAdet: style.Quantity || null,
                hedefMarkUp: this.getExtendedFieldValue(style, 'a21b2b14-8ca3-49f2-8e80-b12823bf14a2'),
                alimHedefFiyati: this.getExtendedFieldValue(style, '79cb5b20-3028-44d4-a85e-ed18c00af3c8')
              });
              matchedColorwayIds.add(colorway.StyleColorwayId);
              foundMatch = true;
              break;
            }
          }
        }

        results.push({
          marka: placeholder.MARKA,
          brandId: placeholder.BrandId,
          opsiyonKodu: placeholder['Opsiyon Kodu'],
          urunGrubu: placeholder['ÜRÜN GRUBU'],
          subCategoryId: placeholder.SubCategoryId,
          urunAltGrup: placeholder['Ürün Alt Grup'],
          subSubCategoryId: placeholder.SubSubCategoryId,
          fashionPyramid: placeholder['Fashion Pyramid'],
          fashionPyramidId: placeholder.CUD1,
          lifeStyleGrup: placeholder['Life Style Grup'],
          lifeStyleGrupId: placeholder.CUD4,
          ft: placeholder.FT,
          ftId: placeholder.CUD5,
          segment: placeholder.Segment,
          segmentId: placeholder.UDF5Id,
          // V6 ekleri
          seasonId: placeholder.SeasonId,
          faz: placeholder.FreeFieldThree,
          // Plan vs Gerçekleşen
          planOptionSay: 1,
          gerceklesenOptionSay: matchedColorways.length,
          gerceklesenUrunKodu: matchedColorways.map(c => c.styleCode).join(', '),
          gerceklesenRenkKodu: matchedColorways.map(c => c.colorwayCode).join(', '),
          gerceklesenRenkAdi: matchedColorways.map(c => c.colorwayName).join(', '),
          gerceklesenFreeFieldFive: matchedColorways.map(c => c.freeFieldFive).join(', '),
          gerceklesenPsf: matchedColorways.length > 0 ? matchedColorways[0].psf : null,
          gerceklesenOnAdet: matchedColorways.length > 0 ? matchedColorways[0].onAdet : null,
          gerceklesenPlanlananAdet: matchedColorways.length > 0 ? matchedColorways[0].planlananAdet : null,
          gerceklesenHedefMarkUp: matchedColorways.length > 0 ? matchedColorways[0].hedefMarkUp : null,
          gerceklesenAlimHedefFiyati: matchedColorways.length > 0 ? matchedColorways[0].alimHedefFiyati : null,
          gerceklesenDetay: matchedColorways
        });
      }

      console.log(`✅ ${results.length} placeholder için eşleştirme tamamlandı`);
      console.log(`📊 Toplam ${matchedColorwayIds.size} colorway eşleşti`);

      // Eşleşmeyen B-cluster colorway'ler (Plan=0, Gerçekleşen=1)
      console.log(`\n🔍 Planlanmayan B-cluster colorway'ler ekleniyor...`);
      let unmatchedCount = 0;

      for (const style of plmStyles) {
        if (!style.StyleColorways || !Array.isArray(style.StyleColorways)) continue;

        for (const colorway of style.StyleColorways) {
          if (!colorway) continue;
          if (colorway.FreeFieldOne !== 'B') continue;
          if (matchedColorwayIds.has(colorway.StyleColorwayId)) continue;

          unmatchedCount++;
          const fashionPyramidName = colorway.ColorwayUserField1 != null
            ? (FASHION_PYRAMID_LOOKUP[colorway.ColorwayUserField1] || `ID:${colorway.ColorwayUserField1}`)
            : null;

          results.push({
            marka: style.Brand?.Name || null,
            brandId: style.Brand?.Id || null,
            opsiyonKodu: null,
            urunGrubu: style.SubCategory?.Name || null,
            subCategoryId: style.SubCategory?.Id || null,
            urunAltGrup: style.ProductSubSubCategory?.Name || null,
            subSubCategoryId: style.ProductSubSubCategory?.Id || null,
            fashionPyramid: fashionPyramidName,
            fashionPyramidId: colorway.ColorwayUserField1 ?? null,
            lifeStyleGrup: colorway.ColorwayUserDefinedField4?.Name || null,
            lifeStyleGrupId: colorway.ColorwayUserDefinedField4?.Id || null,
            ft: colorway.ColorwayUserDefinedField5?.Name || null,
            ftId: colorway.ColorwayUserDefinedField5?.Id || null,
            segment: style.UserDefinedField5?.Name || null,
            segmentId: style.UserDefinedField5?.Id || null,
            // V6 ekleri
            seasonId: style.SeasonId || null,
            faz: colorway.FreeFieldThree || null,
            // Plan vs Gerçekleşen
            planOptionSay: 0,
            gerceklesenOptionSay: 1,
            gerceklesenUrunKodu: style.StyleCode,
            gerceklesenRenkKodu: colorway.Code,
            gerceklesenRenkAdi: colorway.Name,
            gerceklesenFreeFieldFive: colorway.FreeFieldFive || null,
            gerceklesenPsf: style.MarketField3?.Name || null,
            gerceklesenOnAdet: style.NumericValue1 || null,
            gerceklesenPlanlananAdet: style.Quantity || null,
            gerceklesenHedefMarkUp: this.getExtendedFieldValue(style, 'a21b2b14-8ca3-49f2-8e80-b12823bf14a2'),
            gerceklesenAlimHedefFiyati: this.getExtendedFieldValue(style, '79cb5b20-3028-44d4-a85e-ed18c00af3c8'),
            gerceklesenDetay: [{
              styleCode: style.StyleCode,
              colorwayCode: colorway.Code,
              colorwayName: colorway.Name,
              freeFieldFive: colorway.FreeFieldFive || null,
              styleColorwayId: colorway.StyleColorwayId,
              psf: style.MarketField3?.Name || null,
              onAdet: style.NumericValue1 || null,
              planlananAdet: style.Quantity || null,
              hedefMarkUp: this.getExtendedFieldValue(style, 'a21b2b14-8ca3-49f2-8e80-b12823bf14a2'),
              alimHedefFiyati: this.getExtendedFieldValue(style, '79cb5b20-3028-44d4-a85e-ed18c00af3c8')
            }]
          });
        }
      }

      console.log(`📊 ${unmatchedCount} planlanmamış colorway eklendi`);
      console.log(`✅ Toplam ${results.length} kayıt oluşturuldu\n`);

      return results;
    } catch (error) {
      console.error('❌ V6 eşleştirme hatası:', error.message);
      throw error;
    }
  }

  calculateSummary(data) {
    return {
      toplamPlanlanan: data.reduce((s, r) => s + r.planOptionSay, 0),
      toplamGerceklesen: data.reduce((s, r) => s + r.gerceklesenOptionSay, 0),
      fark: data.reduce((s, r) => s + r.gerceklesenOptionSay, 0) - data.reduce((s, r) => s + r.planOptionSay, 0),
      eslesen: data.filter(r => r.planOptionSay > 0 && r.gerceklesenOptionSay > 0).length,
      sadecePlanlanan: data.filter(r => r.planOptionSay > 0 && r.gerceklesenOptionSay === 0).length,
      sadaceGerceklesen: data.filter(r => r.planOptionSay === 0 && r.gerceklesenOptionSay > 0).length,
      toplamKayit: data.length
    };
  }
}

module.exports = new RangeCountSourceV6Service();
