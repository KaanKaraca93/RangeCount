const axios = require('axios');
const tokenService = require('./tokenService');
const PLM_CONFIG = require('../config/plm.config');

/**
 * PLM Style Service
 * StyleId ile PLM'den veri çeker ve geçen sezon verilerini oluşturur
 */
class PlmStyleService {
  
  /**
   * PLM'den style bilgisi çek
   * @param {number} styleId - Style ID
   * @returns {Promise<Object>} Style bilgisi
   */
  async getStyleFromPlm(styleId) {
    try {
      const authHeader = await tokenService.getAuthorizationHeader();
      
      const url = `${PLM_CONFIG.ionApiUrl}/ATJZAMEWEF5P4SNV_TST/FASHIONPLM/odata2/api/odata2/STYLE`;
      const params = {
        '$filter': `StyleId eq ${styleId}`,
        '$select': 'StyleId,StyleCode,UserDefinedField7Id'
      };
      
      console.log(`📞 PLM'e istek atılıyor: StyleId=${styleId}`);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        params: params
      });
      
      if (response.data && response.data.value && response.data.value.length > 0) {
        return response.data.value[0];
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ PLM isteği hatası:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }
  
  /**
   * Geçen sezon verilerini oluştur (UDF7'ye göre)
   * @param {Object} styleData - PLM'den gelen style verisi
   * @returns {Object} Geçen sezon verileri
   */
  generatePastSeasonData(styleData) {
    const udf7 = styleData.UserDefinedField7Id;
    
    // UDF7 null veya boş ise tüm değerler 0
    if (!udf7 || udf7.trim() === '') {
      console.log('ℹ️  UDF7 boş - Tüm değerler 0 olarak döndürülüyor');
      return {
        styleId: styleData.StyleId,
        styleCode: styleData.StyleCode,
        previousSeasonStyleCode: null,
        hasData: false,
        data: {
          sellout: 0,
          markdown: 0,
          ros: 0,
          fobCostUSD: 0,
          fabricCost: 0,
          trimCost: 0,
          laborCost: 0,
          embroideryCost: 0
        }
      };
    }
    
    // UDF7 dolu ise random değerler oluştur
    console.log(`✅ UDF7 mevcut: ${udf7} - Random veriler oluşturuluyor`);
    
    return {
      styleId: styleData.StyleId,
      styleCode: styleData.StyleCode,
      previousSeasonStyleCode: udf7,
      hasData: true,
      data: {
        sellout: this.randomInt(50, 500),           // 50-500 adet
        markdown: this.randomDecimal(0, 40),        // %0-40 indirim
        ros: this.randomDecimal(60, 95),            // %60-95 satış oranı
        fobCostUSD: this.randomDecimal(15, 85),     // $15-85
        fabricCost: this.randomDecimal(8, 45),      // $8-45
        trimCost: this.randomDecimal(1, 8),         // $1-8
        laborCost: this.randomDecimal(5, 20),       // $5-20
        embroideryCost: this.randomDecimal(0, 15)   // $0-15
      }
    };
  }
  
  /**
   * Random integer oluştur
   */
  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  /**
   * Random decimal oluştur (2 ondalık basamak)
   */
  randomDecimal(min, max) {
    return parseFloat((Math.random() * (max - min) + min).toFixed(2));
  }
  
  /**
   * StyleId ile geçen sezon verisini getir
   * @param {number} styleId - Style ID
   * @returns {Promise<Object>} Geçen sezon verisi
   */
  async getPastSeasonData(styleId) {
    try {
      // PLM'den style bilgisi çek
      const styleData = await this.getStyleFromPlm(styleId);
      
      if (!styleData) {
        throw new Error(`Style not found: StyleId=${styleId}`);
      }
      
      // Geçen sezon verilerini oluştur
      const pastSeasonData = this.generatePastSeasonData(styleData);
      
      return pastSeasonData;
      
    } catch (error) {
      console.error('❌ Geçen sezon verisi oluşturma hatası:', error.message);
      throw error;
    }
  }
}

// Singleton instance
const plmStyleService = new PlmStyleService();

module.exports = plmStyleService;

