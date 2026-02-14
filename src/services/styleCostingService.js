const axios = require('axios');
const tokenService = require('./tokenService');
const PLM_CONFIG = require('../config/plm.config');

/**
 * Style Costing Service
 * Her colorway için maliyet bilgilerini getir (SupplierId=2)
 */
class StyleCostingService {
  /**
   * PLM'den style costing verilerini çek
   * SupplierId=2 (Hedef Maliyet) için tüm cost elements + extended fields
   */
  async fetchStyleCostingData() {
    try {
      const authHeader = await tokenService.getAuthorizationHeader();
      
      const url = `${PLM_CONFIG.ionApiUrl}/${PLM_CONFIG.tenantId}/FASHIONPLM/odata2/api/odata2/STYLE`;
      const params = {
        '$select': 'StyleId,StyleCode,NumericValue1,Quantity,DeliveryIdList,Remark',
        '$filter': 'SeasonId eq 10 and BrandId in (4,8) and DivisionId eq 6 and Status ne 103 and Status ne 1',
        '$expand': 'Season($select=Name),StyleStatus($select=Name),MarketField5($select=Name),SubCategory($select=Name),ProductSubSubCategory($select=Name),Brand($select=Name),StyleColorways($select=StyleColorwayId,Code,Name,MinimumQuantity,ColorwayStatus,ColorwayUserField1,ColorwayUserField4,ColorwayUserField5,FreeFieldOne,FreeFieldFive;$expand=theme($select=Code,Name,Description);$filter=ColorwayStatus ne 4),StyleExtendedFieldValues($select=StyleId,Id,ExtFldId,NumberValue,CheckBoxValue;$expand=StyleExtendedFields($select=Name)),StyleCosting($expand=StyleCostElements($expand=StyleCostingSupplierVals),StyleCostSuppliers($expand=StyleSupplier($select=Id,SupplierId,Code,SupplierName));$select=Id,CostModelId,CurrencyId)'
      };
      
      console.log(`📞 PLM'den style costing verileri çekiliyor...`);
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
   * Style'dan SupplierId=2 için StyleCostingSupplierId'yi bul
   */
  getTargetStyleCostingSupplierId(styleCosting) {
    if (!styleCosting) {
      return null;
    }

    // StyleCostSuppliers case-insensitive
    const suppliers = styleCosting.StyleCostSuppliers || styleCosting.STYLECOSTSUPPLIERS || [];
    
    const targetSupplier = suppliers.find(
      supplier => {
        const styleSupplier = supplier.StyleSupplier || supplier.STYLESUPPLIER;
        return styleSupplier && styleSupplier.SupplierId === 2;
      }
    );

    return targetSupplier ? targetSupplier.Id : null;
  }

  /**
   * Cost Elements'ten değerleri çıkar
   * @returns {Object} { RPSF: 5999, RMU: 4.95, ... }
   */
  extractCostElements(styleCosting, styleCostingSupplierId) {
    const costValues = {};

    if (!styleCosting) {
      return costValues;
    }

    // StyleCostElements case-insensitive
    const elements = styleCosting.StyleCostElements || styleCosting.STYLECOSTELEMENTS || [];

    elements.forEach(element => {
      const code = element.Code;
      
      // StyleCostingSupplierVals case-insensitive
      const supplierVals = element.StyleCostingSupplierVals || element.STYLECOSTINGSUPPLIERVALS || [];
      
      const supplierVal = supplierVals.find(
        sv => sv.StyleCostingSupplierId === styleCostingSupplierId
      );

      if (supplierVal) {
        costValues[code] = supplierVal.Value;
      } else {
        costValues[code] = null;
      }
    });

    return costValues;
  }

  /**
   * Extended Fields'tan değerleri çıkar
   * CheckBoxValue null değilse "true"/"false" string olarak yaz
   * Değilse NumberValue al
   * İkisi de null'sa null
   * @returns {Object} { Cost10: 55.0, SelectLocal: "false", MarkUp: 4.95, ... }
   */
  extractExtendedFields(styleExtendedFieldValues) {
    const extendedValues = {};

    // Case-insensitive
    const fields = styleExtendedFieldValues || [];

    if (!Array.isArray(fields)) {
      return extendedValues;
    }

    fields.forEach(field => {
      // StyleExtendedFields case-insensitive
      const extFields = field.StyleExtendedFields || field.STYLEEXTENDEDFIELDS;
      const name = extFields && extFields.Name ? extFields.Name : `Field_${field.ExtFldId}`;
      
      let value = null;
      
      // Öncelik: CheckBoxValue null değilse onu kullan
      if (field.CheckBoxValue !== null && field.CheckBoxValue !== undefined) {
        // Checkbox değerini string olarak yaz
        value = field.CheckBoxValue ? "true" : "false";
      } 
      // CheckBoxValue null ise NumberValue'ya bak
      else if (field.NumberValue !== null && field.NumberValue !== undefined && field.NumberValue !== '') {
        // NumberValue string ise parseFloat yap
        value = typeof field.NumberValue === 'string' ? parseFloat(field.NumberValue) : field.NumberValue;
      }
      // İkisi de null ise null kalsın
      else {
        value = null;
      }

      extendedValues[name] = value;
    });

    return extendedValues;
  }

  /**
   * Styles'ı colorway bazında unpivot et
   * Her satır = 1 Colorway
   * Kolonlar = Sabit bilgiler + Cost Elements + Extended Fields
   */
  async calculateCostingData() {
    try {
      console.log('🔧 Style costing hesaplaması başlatılıyor...');
      
      const styles = await this.fetchStyleCostingData();
      const results = [];

      styles.forEach(style => {
        // StyleCosting var mı? (case-insensitive)
        const styleCosting = (style.STYLECOSTING && style.STYLECOSTING.length > 0) 
          ? style.STYLECOSTING[0] 
          : (style.StyleCosting && style.StyleCosting.length > 0)
            ? style.StyleCosting[0]
            : null;
        
        // SupplierId=2 için StyleCostingSupplierId'yi bul
        const styleCostingSupplierId = styleCosting ? this.getTargetStyleCostingSupplierId(styleCosting) : null;
        
        // Cost Elements'i çıkar
        const costElements = styleCosting && styleCostingSupplierId 
          ? this.extractCostElements(styleCosting, styleCostingSupplierId)
          : {};

        // Extended Fields'i çıkar (case-insensitive)
        const extendedFieldValues = style.StyleExtendedFieldValues || style.STYLEEXTENDEDFIELDVALUES || [];
        const extendedFields = this.extractExtendedFields(extendedFieldValues);

        // Her colorway için satır oluştur
        if (style.StyleColorways && Array.isArray(style.StyleColorways)) {
          style.StyleColorways.forEach(colorway => {
            const row = {
              // Style bilgileri
              styleId: style.StyleId,
              styleCode: style.StyleCode,
              numericValue1: style.NumericValue1, // PSF
              quantity: style.Quantity, // Planlanan Adet
              deliveryIdList: style.DeliveryIdList,
              remark: style.Remark,
              
              // Yeni alanlar
              season: style.Season ? style.Season.Name : null,
              styleStatus: style.StyleStatus ? style.StyleStatus.Name : null,
              
              // Kategorik bilgiler
              marka: style.Brand ? style.Brand.Name : null,
              brandId: style.Brand ? style.Brand.Id : null,
              urunGrubu: style.SubCategory ? style.SubCategory.Name : null,
              subCategoryId: style.SubCategory ? style.SubCategory.Id : null,
              urunAltGrubu: (style.ProductSubSubCategory || style.Productsubsubcategory) ? (style.ProductSubSubCategory || style.Productsubsubcategory).Name : null,
              subSubCategoryId: (style.ProductSubSubCategory || style.Productsubsubcategory) ? (style.ProductSubSubCategory || style.Productsubsubcategory).Id : null,
              marketField5: style.MarketField5 ? style.MarketField5.Name : null,
              udf5: style.UserDefinedField5 ? style.UserDefinedField5.Name : null,
              udf5Id: style.UserDefinedField5 ? style.UserDefinedField5.Id : null,
              
              // Colorway bilgileri
              colorwayId: colorway.StyleColorwayId,
              colorwayCode: colorway.Code,
              colorwayName: colorway.Name,
              colorwayStatus: colorway.ColorwayStatus,
              minimumQuantity: colorway.MinimumQuantity,
              colorwayUserField1: colorway.ColorwayUserField1, // Fashion Pyramid
              colorwayUserField4: colorway.ColorwayUserField4, // Yeni alan
              colorwayUserField5: colorway.ColorwayUserField5, // Yeni alan
              freeFieldOne: colorway.FreeFieldOne, // Cluster
              freeFieldFive: colorway.FreeFieldFive,
              cud4: colorway.ColorwayUserDefinedField4 ? colorway.ColorwayUserDefinedField4.Name : null,
              cud4Id: colorway.ColorwayUserDefinedField4 ? colorway.ColorwayUserDefinedField4.Id : null,
              cud5: colorway.ColorwayUserDefinedField5 ? colorway.ColorwayUserDefinedField5.Name : null,
              cud5Id: colorway.ColorwayUserDefinedField5 ? colorway.ColorwayUserDefinedField5.Id : null,
              
              // Theme bilgileri (colorway seviyesinde - case-insensitive)
              themeCode: (colorway.theme || colorway.Theme) ? (colorway.theme || colorway.Theme).Code : null,
              themeName: (colorway.theme || colorway.Theme) ? (colorway.theme || colorway.Theme).Name : null,
              themeDescription: (colorway.theme || colorway.Theme) ? (colorway.theme || colorway.Theme).Description : null,
              
              // Costing bilgileri
              hasCostingData: styleCostingSupplierId ? true : false,
              styleCostingSupplierId: styleCostingSupplierId,
              
              // Cost Elements (dinamik kolonlar)
              ...costElements,
              
              // Extended Fields (dinamik kolonlar)
              ...extendedFields
            };

            results.push(row);
          });
        }
      });

      console.log(`✅ Toplam ${results.length} colorway satırı oluşturuldu`);
      console.log(`   - Costing verisi olan: ${results.filter(r => r.hasCostingData).length}`);
      console.log(`   - Costing verisi olmayan: ${results.filter(r => !r.hasCostingData).length}`);

      // Cost Element başlıklarını logla
      if (results.length > 0) {
        const sampleRow = results.find(r => r.hasCostingData);
        if (sampleRow) {
          const costCols = Object.keys(sampleRow).filter(k => 
            !['styleId', 'styleCode', 'numericValue1', 'quantity', 'deliveryIdList', 'remark',
              'marka', 'brandId', 'urunGrubu', 'subCategoryId', 'urunAltGrubu', 'subSubCategoryId',
              'marketField5', 'udf5', 'udf5Id', 'colorwayId', 'colorwayCode', 'colorwayName',
              'colorwayUserField1', 'freeFieldOne', 'freeFieldFive', 'cud4', 'cud4Id', 'cud5', 'cud5Id',
              'themeCode', 'themeName', 'themeDescription', 'hasCostingData', 'styleCostingSupplierId'
            ].includes(k)
          );
          console.log(`   - Toplam ${costCols.length} cost/extended field kolonu`);
          console.log(`   - Örnek kolonlar: ${costCols.slice(0, 10).join(', ')}`);
        }
      }

      return results;
      
    } catch (error) {
      console.error('❌ Costing hesaplama hatası:', error.message);
      throw error;
    }
  }

  /**
   * Özet bilgiler
   */
  async getSummary() {
    try {
      const data = await this.calculateCostingData();
      
      const summary = {
        totalColorways: data.length,
        withCostingData: data.filter(d => d.hasCostingData).length,
        withoutCostingData: data.filter(d => !d.hasCostingData).length,
        uniqueStyles: new Set(data.map(d => d.styleId)).size,
        brands: [...new Set(data.map(d => d.marka).filter(Boolean))],
        categories: [...new Set(data.map(d => d.urunGrubu).filter(Boolean))],
        
        // Cost element listesi
        costElements: [],
        extendedFields: []
      };

      // İlk costing verisi olan satırdan kolonları al
      const sampleRow = data.find(d => d.hasCostingData);
      if (sampleRow) {
        const allKeys = Object.keys(sampleRow);
        const staticFields = ['styleId', 'styleCode', 'numericValue1', 'quantity', 'deliveryIdList', 'remark',
          'season', 'styleStatus',
          'marka', 'brandId', 'urunGrubu', 'subCategoryId', 'urunAltGrubu', 'subSubCategoryId',
          'marketField5', 'udf5', 'udf5Id', 'colorwayId', 'colorwayCode', 'colorwayName', 'colorwayStatus', 'minimumQuantity',
          'colorwayUserField1', 'colorwayUserField4', 'colorwayUserField5', 'freeFieldOne', 'freeFieldFive', 'cud4', 'cud4Id', 'cud5', 'cud5Id',
          'themeCode', 'themeName', 'themeDescription', 'hasCostingData', 'styleCostingSupplierId'];
        
        const dynamicFields = allKeys.filter(k => !staticFields.includes(k));
        
        // Cost elements genellikle uppercase (RPSF, TCOST, FOB)
        // Extended fields ise CamelCase veya başka format (Cost10, Cur3, MarkUp)
        summary.costElements = dynamicFields.filter(f => f === f.toUpperCase());
        summary.extendedFields = dynamicFields.filter(f => f !== f.toUpperCase());
      }

      return summary;
      
    } catch (error) {
      console.error('❌ Summary hesaplama hatası:', error.message);
      throw error;
    }
  }
}

module.exports = new StyleCostingService();
