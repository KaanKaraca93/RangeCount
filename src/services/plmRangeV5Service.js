const XLSX = require('xlsx');
const axios = require('axios');
const PLM_CONFIG = require('../config/plm.config');
const tokenService = require('./tokenService');

class PLMRangeV5Service {
  constructor() {
    this.dropdownCache = null;
  }

  /**
   * RangeSayacv5.xlsx'den plan verilerini oku
   */
  readPlanData() {
    try {
      const workbook = XLSX.readFile('Rangesayacv5.xlsx');
      const worksheet = workbook.Sheets['Sayfa1'];
      const data = XLSX.utils.sheet_to_json(worksheet);

      console.log(`📊 Excel'den ${data.length} satır plan verisi okundu`);
      return data;
    } catch (error) {
      console.error('❌ Excel okuma hatası:', error.message);
      throw error;
    }
  }

  /**
   * PLM'den style'ları ve range verilerini çek
   */
  async fetchStylesFromPLM() {
    try {
      const authHeader = await tokenService.getAuthorizationHeader();
      const url = `${PLM_CONFIG.ionApiUrl}/${PLM_CONFIG.tenantId}/FASHIONPLM/odata2/api/odata2/Style`;
      
      const params = {
        '$filter': 'SeasonId eq 10 and IsDeleted eq 0 and Status ne 103 and status ne 1 and BrandId in (4,8) and DivisionId eq 6',
        '$select': 'StyleId,StyleCode',
        '$expand': 'styleextendedfieldvalues($select=DropdownValues,Id,ExtFldId;$filter=ExtFldId eq e8b38ebc-0c41-4bdf-b228-f3ba7d136dd0 or ExtFldId eq b37df9ef-7877-4f8a-b850-b5335cc790db or ExtFldId eq a8af8331-0c65-49e1-94aa-e2abac635749 or ExtFldId eq 0e41ca5e-d812-47e5-8b5b-3e018294683b or ExtFldId eq c075b044-335f-4129-a5e7-c51745591e25 or ExtFldId eq cc4fdbe7-c46e-41e7-8047-29793bccfdd0 or ExtFldId eq 38ba7340-72b8-434b-a246-def36b7db42a;$expand=StyleExtendedFields($select=Name)),brand,SubCategory,ProductSubSubCategory,UserDefinedField5,StyleColorways($select=StyleColorwayId,Code,Name,FreeFieldOne;$expand=ColorwayUserDefinedField5;$filter=ColorwayStatus ne 4)'
      };

      const response = await axios.get(url, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        params: params
      });

      console.log(`✅ PLM'den ${response.data.value.length} ürün çekildi`);
      return response.data.value || [];
    } catch (error) {
      console.error('❌ PLM API hatası:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * ExtendedFieldDropDown verilerini çek (cache'lenmiş)
   */
  async fetchDropdownData() {
    if (this.dropdownCache) {
      return this.dropdownCache;
    }

    try {
      const authHeader = await tokenService.getAuthorizationHeader();
      const url = `${PLM_CONFIG.ionApiUrl}/${PLM_CONFIG.tenantId}/FASHIONPLM/odata2/api/odata2/ExtendedFieldDropDown`;
      
      const params = {
        '$filter': 'ExtFldId eq e8b38ebc-0c41-4bdf-b228-f3ba7d136dd0 or ExtFldId eq b37df9ef-7877-4f8a-b850-b5335cc790db or ExtFldId eq a8af8331-0c65-49e1-94aa-e2abac635749 or ExtFldId eq 0e41ca5e-d812-47e5-8b5b-3e018294683b or ExtFldId eq c075b044-335f-4129-a5e7-c51745591e25 or ExtFldId eq cc4fdbe7-c46e-41e7-8047-29793bccfdd0 or ExtFldId eq 38ba7340-72b8-434b-a246-def36b7db42a'
      };

      const response = await axios.get(url, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        params: params
      });

      // ID'ye göre mapping oluştur
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
      console.error('❌ Dropdown API hatası:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Range verilerini hesapla (Unpivot - Ham veri)
   */
  async calculateRangeData() {
    try {
      console.log('🔄 Range verileri hesaplanıyor (Unpivot format)...');

      // 1. Excel'den planı oku
      const planData = this.readPlanData();

      // 2. PLM'den style'ları çek
      const styles = await this.fetchStylesFromPLM();

      // 3. Dropdown verilerini çek
      const dropdownMap = await this.fetchDropdownData();

      // 4. Her plan satırını Option Say kadar çoğaltarak placeholder ID ver
      const placeholders = [];
      let placeholderCounter = 1;
      
      planData.forEach((plan) => {
        const optionCount = plan['Option Say'] || 1; // Option Say kadar placeholder oluştur
        
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
            key: `${plan.BrandId}_${plan.SubSubCategoryId}_${plan.ExtFldId}_${plan.DropDownValue}_${plan.CUD5Id}`
          });
          placeholderCounter++;
        }
      });

      // 5. Colorway'leri topla ve eşleştir
      const colorwayMatches = {}; // key -> array of colorways

      styles.forEach(style => {
        const brandId = style.Brand?.Id;
        const subSubCategoryId = style.ProductSubSubCategory?.Id;
        const styleId = style.StyleId;
        const styleCode = style.StyleCode;

        // Her colorway için
        if (style.StyleColorways && style.StyleColorways.length > 0) {
          style.StyleColorways.forEach(colorway => {
            // Cluster=B kontrolü
            if (colorway.FreeFieldOne !== 'B') {
              return; // Skip
            }

            const colorwayId = colorway.StyleColorwayId;
            const colorwayCode = colorway.Code;
            const colorwayName = colorway.Name;
            const cud5Id = colorway.ColorwayUserDefinedField5?.Id || null;

            // Her range field için
            if (style.StyleExtendedFieldValues && style.StyleExtendedFieldValues.length > 0) {
              style.StyleExtendedFieldValues.forEach(extField => {
                const dropdownValues = extField.DropdownValues;
                
                // Boş kontrolü
                if (!dropdownValues || dropdownValues === '') {
                  return; // Skip
                }

                // String'i array'e çevir (virgülle ayrılmış olabilir)
                const dropdownIds = dropdownValues.split(',').map(v => parseInt(v.trim()));

                dropdownIds.forEach(dropDownValue => {
                  // Eşleştirme key'i oluştur
                  const key = `${brandId}_${subSubCategoryId}_${extField.ExtFldId}_${dropDownValue}_${cud5Id}`;

                  if (!colorwayMatches[key]) {
                    colorwayMatches[key] = [];
                  }

                  // Aynı colorway'i iki kez ekleme
                  const alreadyExists = colorwayMatches[key].some(c => c.colorwayId === colorwayId);
                  if (!alreadyExists) {
                    colorwayMatches[key].push({
                      styleId,
                      styleCode,
                      colorwayId,
                      colorwayCode,
                      colorwayName
                    });
                  }
                });
              });
            }
          });
        }
      });

      // 6. Unpivot sonuçları oluştur
      const results = [];
      const usedColorways = {}; // Her key için hangi colorway'ler kullanıldı

      // Aynı key'e sahip placeholder'ları grupla
      const placeholderGroups = {};
      placeholders.forEach(ph => {
        if (!placeholderGroups[ph.key]) {
          placeholderGroups[ph.key] = [];
        }
        placeholderGroups[ph.key].push(ph);
      });

      // Her placeholder için
      placeholders.forEach(placeholder => {
        const matchedColorways = colorwayMatches[placeholder.key] || [];

        // Bu key için daha önce kullanılmamış bir colorway bul
        if (!usedColorways[placeholder.key]) {
          usedColorways[placeholder.key] = [];
        }

        const unusedColorway = matchedColorways.find(
          cw => !usedColorways[placeholder.key].includes(cw.colorwayId)
        );

        if (unusedColorway) {
          // Eşleşen colorway bulundu, kullan
          usedColorways[placeholder.key].push(unusedColorway.colorwayId);
          
          results.push({
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
            plan: 1,
            gerceklesen: 1,
            styleId: unusedColorway.styleId,
            styleCode: unusedColorway.styleCode,
            colorwayId: unusedColorway.colorwayId,
            colorwayCode: unusedColorway.colorwayCode,
            colorwayName: unusedColorway.colorwayName
          });
        } else {
          // Eşleşmeyen placeholder için boş satır
          results.push({
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
            plan: 1,
            gerceklesen: 0,
            styleId: null,
            styleCode: null,
            colorwayId: null,
            colorwayCode: null,
            colorwayName: null
          });
        }
      });

      // 7. Plan'da olmayan gerçekleşenleri kontrol et (sadece planda tanımlı RangeTag'ler için)
      // Önce her BrandId+SubSubCategoryId için planda hangi ExtFldId'ler (RangeTag'ler) var tespit et
      const plannedExtFldIds = {};
      placeholders.forEach(p => {
        const key = `${p.brandId}_${p.subSubCategoryId}`;
        if (!plannedExtFldIds[key]) {
          plannedExtFldIds[key] = new Set();
        }
        plannedExtFldIds[key].add(p.extFldId);
      });

      // Plan dışı gerçekleşenleri kontrol et
      let unplannedCount = 0;
      Object.keys(colorwayMatches).forEach(key => {
        const placeholder = placeholders.find(p => p.key === key);
        
        if (!placeholder) {
          // Bu key için plan yok, gerçekleşen var
          const parts = key.split('_');
          const brandId = parseInt(parts[0]);
          const subSubCategoryId = parseInt(parts[1]);
          const extFldId = parts[2];
          const dropDownValue = parseInt(parts[3]);
          const cud5Id = parseInt(parts[4]);

          // Bu ürün grubu için bu ExtFldId planda tanımlı mı kontrol et
          const productKey = `${brandId}_${subSubCategoryId}`;
          const isExtFldIdPlanned = plannedExtFldIds[productKey] && plannedExtFldIds[productKey].has(extFldId);

          // Eğer bu ExtFldId planda tanımlı değilse, bu gerçekleşeni atla
          if (!isExtFldIdPlanned) {
            return; // Skip - RangeTag planda tanımlı değil
          }

          // RangeTag planda tanımlı ama bu spesifik DropDownValue yok
          // Plan=0, Gerçekleşen=1 olarak ekle (PlaceholderId = null)

          // Dropdown'dan bilgileri al
          const dropdownInfo = dropdownMap[dropDownValue];
          const rangeDetayi = dropdownInfo ? dropdownInfo.name : `ID_${dropDownValue}`;

          // Marka ve ürün grubu bilgisini bul
          const samplePlan = placeholders.find(p => p.brandId === brandId && p.subSubCategoryId === subSubCategoryId);
          const marka = samplePlan ? samplePlan.marka : (brandId === 4 ? 'Ipekyol' : 'Twist');
          const urunGrubu = samplePlan ? samplePlan.urunGrubu : 'Unknown';

          // Range bilgisini bul (BrandId + SubSubCategoryId + ExtFldId kombinasyonuna göre)
          let range = 'Unknown';
          let rangeTag = 'Unknown';
          const sampleRangeInfo = placeholders.find(p => 
            p.extFldId === extFldId && 
            p.brandId === brandId && 
            p.subSubCategoryId === subSubCategoryId
          );
          if (sampleRangeInfo) {
            range = sampleRangeInfo.range;
            rangeTag = sampleRangeInfo.rangeTag;
          }

          // Her colorway için satır ekle (PlaceholderId = null)
          // Ama sadece bu ExtFldId için daha önce kullanılmamışsa ekle
          colorwayMatches[key].forEach(colorway => {
            // Bu colorway bu ExtFldId için daha önce results'a eklendi mi kontrol et
            const alreadyUsedInThisRange = results.some(r => 
              r.colorwayId === colorway.colorwayId && 
              r.extFldId === extFldId
            );
            
            if (!alreadyUsedInThisRange) {
              results.push({
                placeholderId: null, // Plan=0 için ID yok
                marka: marka,
                brandId: brandId,
                urunGrubu: urunGrubu,
                subSubCategoryId: subSubCategoryId,
                rangeTag: rangeTag,
                range: range,
                extFldId: extFldId,
                rangeDetayi: rangeDetayi,
                dropDownValue: dropDownValue,
                cud5Id: cud5Id,
                plan: 0,
                gerceklesen: 1,
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

      console.log(`✅ Toplam ${results.length} unpivot satır oluşturuldu`);
      console.log(`   - Placeholder sayısı: ${placeholders.length}`);
      console.log(`   - Plan=1, Gerçekleşen=1: ${results.filter(r => r.plan === 1 && r.gerceklesen === 1).length} (Eşleşen)`);
      console.log(`   - Plan=1, Gerçekleşen=0: ${results.filter(r => r.plan === 1 && r.gerceklesen === 0).length} (Eşleşmeyen)`);
      console.log(`   - Plan=0, Gerçekleşen=1: ${unplannedCount} (Plan dışı - RangeTag planda var ama değer yok)`);

      return results;
    } catch (error) {
      console.error('❌ Range hesaplama hatası:', error.message);
      throw error;
    }
  }
}

module.exports = new PLMRangeV5Service();
