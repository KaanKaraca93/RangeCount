const axios = require('axios');
const XLSX = require('xlsx');
const path = require('path');
const tokenService = require('./tokenService');
const PLM_CONFIG = require('../config/plm.config');

/**
 * Fashion Pyramid (CUD1) Lookup Table
 * API'den name gelmiyor, hardcode kullanılıyor
 */
const FASHION_PYRAMID_LOOKUP = {
  1: "İMAGE",
  2: "FARKLI",
  4: "NORMAL",
  5: "ÇOK FARKLI",
  6: "Essentials",
  7: "Basics",
  8: "Fashion Core",
  9: "Fashion Newness",
  10: "Fashion Wow",
  11: "Styling Core",
  12: "Twist Signature",
  13: "Twist Fashion",
  14: "Iconic / Hero"
};

/**
 * Range Count Source Service
 * Placeholder bazlı plan vs gerçekleşen karşılaştırması
 */
class RangeCountSourceService {
  constructor() {
    this.placeholders = null;
    this.loadPlaceholders();
  }

  /**
   * Excel'den placeholder planlarını yükle
   */
  loadPlaceholders() {
    try {
      const workbook = XLSX.readFile(path.join(__dirname, '../../RangeSayacv4.xlsx'));
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      this.placeholders = XLSX.utils.sheet_to_json(worksheet);
      
      console.log('✅ Placeholder planı yüklendi:', this.placeholders.length, 'satır');
    } catch (error) {
      console.error('❌ RangeSayacv4.xlsx yüklenirken hata:', error.message);
      this.placeholders = [];
    }
  }

  /**
   * PLM'den style ve colorway verilerini çek
   */
  async fetchStylesFromPLM() {
    try {
      const authHeader = await tokenService.getAuthorizationHeader();
      
      const url = `${PLM_CONFIG.ionApiUrl}/${PLM_CONFIG.tenantId}/FASHIONPLM/odata2/api/odata2/Style`;
      const params = {
        '$filter': 'SeasonId eq 10 and IsDeleted eq 0 and Status ne 103 and Status ne 1 and BrandId in (4,8) and DivisionId eq 6',
        '$select': 'StyleId,StyleCode',
        '$expand': 'Brand,SubCategory,ProductSubSubCategory,UserDefinedField5,StyleColorways($select=StyleColorwayId,Code,Name,ColorwayUserField1,FreeFieldOne;$expand=ColorwayUserDefinedField4,ColorwayUserDefinedField5;$filter=ColorwayStatus ne 4)'
      };
      
      console.log(`📞 PLM'den style verileri çekiliyor...`);
      console.log(`🔍 Filter: ${params['$filter']}`);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        params: params
      });
      
      const styles = response.data.value || [];
      console.log(`✅ PLM'den ${styles.length} style çekildi`);
      
      // Colorway sayısını say
      let totalColorways = 0;
      styles.forEach(style => {
        if (style.StyleColorways && Array.isArray(style.StyleColorways)) {
          totalColorways += style.StyleColorways.length;
        }
      });
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

  /**
   * Placeholder ile PLM colorway'i eşleştir
   */
  matchPlaceholder(placeholder, style, colorway) {
    // Cluster kontrolü (sadece B cluster)
    if (colorway.FreeFieldOne !== 'B') {
      return false;
    }

    // Tam eşleşme kontrolleri (null-safe)
    const matches = 
      (style.Brand && style.Brand.Id === placeholder.BrandId) &&
      (style.SubCategory && style.SubCategory.Id === placeholder.SubCategoryId) &&
      (style.ProductSubSubCategory && style.ProductSubSubCategory.Id === placeholder.SubSubCategoryId) &&
      (colorway.ColorwayUserField1 === placeholder.CUD1) &&
      (colorway.ColorwayUserDefinedField4 && colorway.ColorwayUserDefinedField4.Id === placeholder.CUD4) &&
      (colorway.ColorwayUserDefinedField5 && colorway.ColorwayUserDefinedField5.Id === placeholder.CUD5) &&
      (style.UserDefinedField5 && style.UserDefinedField5.Id === placeholder.UDF5Id);

    return matches;
  }

  /**
   * PLM colorway'lerini placeholder'lara eşleştir
   */
  async matchColorwaysToPlaceholders() {
    try {
      // PLM'den verileri çek
      const plmStyles = await this.fetchStylesFromPLM();
      
      // Her placeholder için eşleşen colorway'leri bul
      const results = [];
      const matchedColorwayIds = new Set(); // Eşleşen colorway'leri track et
      
      // İlk colorway örneğini log'la (debug)
      if (plmStyles.length > 0 && plmStyles[0].StyleColorways && plmStyles[0].StyleColorways.length > 0) {
        const sampleColorway = plmStyles[0].StyleColorways[0];
        console.log(`\n📝 Örnek Colorway:`);
        console.log(`   ColorwayUserField1 (CUD1):`, sampleColorway.ColorwayUserField1);
        console.log(`   ColorwayUserDefinedField4 (CUD4):`, sampleColorway.ColorwayUserDefinedField4);
        console.log(`   ColorwayUserDefinedField5 (CUD5):`, sampleColorway.ColorwayUserDefinedField5);
        console.log(`   FreeFieldOne (Cluster):`, sampleColorway.FreeFieldOne);
      }
      
      // İlk placeholder örneğini log'la (debug)
      if (this.placeholders.length > 0) {
        const samplePH = this.placeholders[0];
        console.log(`\n📝 Örnek Placeholder (${samplePH['Opsiyon Kodu']}):`);
        console.log(`   CUD1:`, samplePH.CUD1);
        console.log(`   CUD4:`, samplePH.CUD4);
        console.log(`   CUD5:`, samplePH.CUD5);
        console.log(`   FT:`, samplePH.FT);
      }
      
      // Placeholder'lar için eşleştirme yap
      console.log(`\n🔄 ${this.placeholders.length} placeholder için eşleştirme yapılıyor...`);
      
      for (const placeholder of this.placeholders) {
        const matchedColorways = [];
        
        for (const style of plmStyles) {
          if (!style.StyleColorways || !Array.isArray(style.StyleColorways)) {
            continue;
          }
          
          for (const colorway of style.StyleColorways) {
            // Colorway null ise skip
            if (!colorway) {
              continue;
            }
            
            // Eşleşme kontrolü
            if (this.matchPlaceholder(placeholder, style, colorway)) {
              matchedColorways.push({
                styleCode: style.StyleCode,
                colorwayCode: colorway.Code,
                colorwayName: colorway.Name,
                styleColorwayId: colorway.StyleColorwayId
              });
              matchedColorwayIds.add(colorway.StyleColorwayId);
            }
          }
        }
        
        // Placeholder için sonuç oluştur
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
          planOptionSay: 1, // Her placeholder 1 option planlar
          gerceklesenOptionSay: matchedColorways.length,
          gerceklesenUrunKodu: matchedColorways.map(c => c.styleCode).join(', '),
          gerceklesenRenkKodu: matchedColorways.map(c => c.colorwayCode).join(', '),
          gerceklesenRenkAdi: matchedColorways.map(c => c.colorwayName).join(', '),
          gerceklesenDetay: matchedColorways
        });
      }
      
      console.log(`✅ ${results.length} placeholder için eşleştirme tamamlandı`);
      console.log(`📊 Toplam ${matchedColorwayIds.size} colorway eşleşti`);
      
      // Eşleşmeyen colorway'leri bul (Plan=0, Gerçekleşen=1)
      console.log(`\n🔍 Planlanmayan colorway'ler aranıyor...`);
      
      let unmatchedCount = 0;
      for (const style of plmStyles) {
        if (!style.StyleColorways || !Array.isArray(style.StyleColorways)) {
          continue;
        }
        
        for (const colorway of style.StyleColorways) {
          if (!colorway) {
            continue;
          }
          
          // Cluster kontrolü (sadece B cluster)
          if (colorway.FreeFieldOne !== 'B') {
            continue;
          }
          
          // Eşleşmemiş mi?
          if (!matchedColorwayIds.has(colorway.StyleColorwayId)) {
            unmatchedCount++;
            
            // Name lookup'lar (ColorwayUserField1 direkt ID döner, null olabilir)
            const fashionPyramidName = colorway.ColorwayUserField1 != null 
              ? (FASHION_PYRAMID_LOOKUP[colorway.ColorwayUserField1] || `ID:${colorway.ColorwayUserField1}`)
              : null;
            
            results.push({
              marka: style.Brand ? style.Brand.Name : null,
              brandId: style.Brand ? style.Brand.Id : null,
              opsiyonKodu: null, // Planlanmamış
              urunGrubu: style.SubCategory ? style.SubCategory.Name : null,
              subCategoryId: style.SubCategory ? style.SubCategory.Id : null,
              urunAltGrup: style.ProductSubSubCategory ? style.ProductSubSubCategory.Name : null,
              subSubCategoryId: style.ProductSubSubCategory ? style.ProductSubSubCategory.Id : null,
              fashionPyramid: fashionPyramidName,
              fashionPyramidId: colorway.ColorwayUserField1 != null ? colorway.ColorwayUserField1 : null,
              lifeStyleGrup: colorway.ColorwayUserDefinedField4 ? colorway.ColorwayUserDefinedField4.Name : null,
              lifeStyleGrupId: colorway.ColorwayUserDefinedField4 ? colorway.ColorwayUserDefinedField4.Id : null,
              ft: colorway.ColorwayUserDefinedField5 ? colorway.ColorwayUserDefinedField5.Name : null,
              ftId: colorway.ColorwayUserDefinedField5 ? colorway.ColorwayUserDefinedField5.Id : null,
              segment: style.UserDefinedField5 ? style.UserDefinedField5.Name : null,
              segmentId: style.UserDefinedField5 ? style.UserDefinedField5.Id : null,
              planOptionSay: 0, // Planlanmamış
              gerceklesenOptionSay: 1,
              gerceklesenUrunKodu: style.StyleCode,
              gerceklesenRenkKodu: colorway.Code,
              gerceklesenRenkAdi: colorway.Name,
              gerceklesenDetay: [{
                styleCode: style.StyleCode,
                colorwayCode: colorway.Code,
                colorwayName: colorway.Name,
                styleColorwayId: colorway.StyleColorwayId
              }]
            });
          }
        }
      }
      
      console.log(`📊 ${unmatchedCount} planlanmamış colorway eklendi (Plan=0, Gerçekleşen=1)`);
      console.log(`✅ Toplam ${results.length} kayıt oluşturuldu\n`);
      
      return results;
      
    } catch (error) {
      console.error('❌ Eşleştirme hatası:', error.message);
      throw error;
    }
  }

  /**
   * Özet istatistikler
   */
  calculateSummary(data) {
    const totalPlanned = data.reduce((sum, row) => sum + row.planOptionSay, 0);
    const totalRealized = data.reduce((sum, row) => sum + row.gerceklesenOptionSay, 0);
    const matched = data.filter(row => row.planOptionSay > 0 && row.gerceklesenOptionSay > 0).length;
    const plannedOnly = data.filter(row => row.planOptionSay > 0 && row.gerceklesenOptionSay === 0).length;
    const realizedOnly = data.filter(row => row.planOptionSay === 0 && row.gerceklesenOptionSay > 0).length;

    return {
      toplamPlanlanan: totalPlanned,
      toplamGerceklesen: totalRealized,
      fark: totalRealized - totalPlanned,
      eslesen: matched,
      sadecePlanlanan: plannedOnly,
      sadaceGerceklesen: realizedOnly,
      toplamKayit: data.length
    };
  }
}

// Singleton instance
const rangeCountSourceService = new RangeCountSourceService();

module.exports = rangeCountSourceService;
