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
      const workbook = XLSX.readFile('RangeSayacv5.xlsx');
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
   * Range verilerini hesapla
   */
  async calculateRangeData() {
    try {
      console.log('🔄 Range verileri hesaplanıyor...');

      // 1. Excel'den planı oku
      const planData = this.readPlanData();

      // 2. PLM'den style'ları çek
      const styles = await this.fetchStylesFromPLM();

      // 3. Dropdown verilerini çek
      const dropdownMap = await this.fetchDropdownData();

      // 4. Planı map'e çevir (hızlı erişim için)
      const planMap = {};
      planData.forEach(plan => {
        const key = `${plan.BrandId}_${plan.SubSubCategoryId}_${plan.ExtFldId}_${plan.DropDownValue}_${plan.CUD5Id}`;
        planMap[key] = {
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
          pOpt: plan['Option Say'] || 0
        };
      });

      // 5. Gerçekleşenleri say
      const actualizedMap = {};

      styles.forEach(style => {
        const brandId = style.Brand?.Id;
        const subSubCategoryId = style.ProductSubSubCategory?.Id;

        // Her colorway için
        if (style.StyleColorways && style.StyleColorways.length > 0) {
          style.StyleColorways.forEach(colorway => {
            // Cluster=B kontrolü
            if (colorway.FreeFieldOne !== 'B') {
              return; // Skip
            }

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

                  // Bu colorway'i bu range'e daha önce saydık mı kontrol et
                  if (!actualizedMap[key]) {
                    actualizedMap[key] = new Set();
                  }

                  // Aynı colorway'i aynı range'e iki kez sayma
                  actualizedMap[key].add(colorway.StyleColorwayId);
                });
              });
            }
          });
        }
      });

      // 6. Sonuçları birleştir
      const results = [];

      // Plandaki kayıtları ekle
      Object.keys(planMap).forEach(key => {
        const plan = planMap[key];
        const gOpt = actualizedMap[key] ? actualizedMap[key].size : 0;
        const fark = gOpt - plan.pOpt;
        const oran = plan.pOpt > 0 ? Math.round((gOpt / plan.pOpt) * 100) : (gOpt > 0 ? 100 : 0);

        results.push({
          marka: plan.marka,
          brandId: plan.brandId,
          urunGrubu: plan.urunGrubu,
          subSubCategoryId: plan.subSubCategoryId,
          rangeTag: plan.rangeTag,
          range: plan.range,
          extFldId: plan.extFldId,
          rangeDetayi: plan.rangeDetayi,
          dropDownValue: plan.dropDownValue,
          cud5Id: plan.cud5Id,
          pOpt: plan.pOpt,
          gOpt: gOpt,
          fark: fark,
          oran: `${oran}%`
        });
      });

      // 7. Plan'da olmayan gerçekleşenleri ekle
      Object.keys(actualizedMap).forEach(key => {
        if (!planMap[key]) {
          const parts = key.split('_');
          const brandId = parseInt(parts[0]);
          const subSubCategoryId = parseInt(parts[1]);
          const extFldId = parts[2];
          const dropDownValue = parseInt(parts[3]);
          const cud5Id = parseInt(parts[4]);

          const gOpt = actualizedMap[key].size;
          
          // Dropdown'dan bilgileri al
          const dropdownInfo = dropdownMap[dropDownValue];
          const rangeDetayi = dropdownInfo ? dropdownInfo.name : `ID_${dropDownValue}`;

          // Marka ve ürün grubu bilgisini bul (diğer kayıtlardan)
          const samplePlan = results.find(r => r.brandId === brandId && r.subSubCategoryId === subSubCategoryId);
          const marka = samplePlan ? samplePlan.marka : (brandId === 4 ? 'Ipekyol' : 'Twist');
          const urunGrubu = samplePlan ? samplePlan.urunGrubu : 'Unknown';

          // Range bilgisini bul (ExtFldId'den)
          let range = 'Unknown';
          let rangeTag = 'Unknown';
          if (dropdownInfo) {
            const sampleRangeInfo = results.find(r => r.extFldId === extFldId);
            if (sampleRangeInfo) {
              range = sampleRangeInfo.range;
              rangeTag = sampleRangeInfo.rangeTag;
            }
          }

          results.push({
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
            pOpt: 0,
            gOpt: gOpt,
            fark: gOpt,
            oran: '100%'
          });
        }
      });

      console.log(`✅ Toplam ${results.length} range kaydı oluşturuldu`);
      console.log(`   - Planda olan: ${Object.keys(planMap).length}`);
      console.log(`   - Plan'da olmayan gerçekleşen: ${results.length - Object.keys(planMap).length}`);

      return results;
    } catch (error) {
      console.error('❌ Range hesaplama hatası:', error.message);
      throw error;
    }
  }
}

module.exports = new PLMRangeV5Service();
