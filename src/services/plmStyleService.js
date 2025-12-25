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
    
    // UDF7 null, undefined veya boş string ise tüm değerler 0
    if (udf7 === null || udf7 === undefined || udf7 === '' || (typeof udf7 === 'string' && udf7.trim() === '')) {
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
    console.log(`✅ UDF7 mevcut: ${udf7} (type: ${typeof udf7}) - Gerçekçi veriler oluşturuluyor`);
    
    // UDF7'yi string'e çevir
    const previousSeasonCode = String(udf7);
    
    // Maliyetleri hesapla (FOB = tümünün toplamı)
    const fabricCost = this.randomDecimal(15, 35);        // Kumaş: en büyük maliyet
    const laborCost = this.randomDecimal(8, 18);          // İşçilik
    const trimCost = this.randomDecimal(2, 6);            // Aksesuar
    const embroideryCost = this.randomDecimal(0, 5);      // Nakış (opsiyonel)
    const fobCostUSD = parseFloat((fabricCost + laborCost + trimCost + embroideryCost).toFixed(2));
    
    // ROS (Rate of Sale) belirle - tekstil perakendeciliğinde %65-90 arası normal
    const ros = this.randomDecimal(65, 90);
    
    // Markdown - ROS ile ters orantılı
    // Yüksek ROS = düşük markdown (iyi satan ürün)
    // Düşük ROS = yüksek markdown (zor satan ürün)
    let markdown;
    if (ros >= 85) {
      markdown = this.randomDecimal(5, 20);      // Çok iyi satıyor, az indirim
    } else if (ros >= 75) {
      markdown = this.randomDecimal(15, 30);     // İyi satıyor, orta indirim
    } else {
      markdown = this.randomDecimal(25, 45);     // Zor satıyor, yüksek indirim
    }
    
    // Sellout - ROS'a göre belirle
    // ROS yüksekse sellout da yüksek olmalı
    const baseQty = this.randomInt(100, 300);
    const sellout = Math.round(baseQty * (ros / 100));
    
    return {
      styleId: styleData.StyleId,
      styleCode: styleData.StyleCode,
      previousSeasonStyleCode: previousSeasonCode,
      hasData: true,
      data: {
        sellout: sellout,                         // ROS'a göre hesaplanan satış
        markdown: markdown,                       // ROS ile ilişkili indirim
        ros: ros,                                 // Satış oranı %65-90
        fobCostUSD: fobCostUSD,                   // Toplam FOB maliyet
        fabricCost: fabricCost,                   // Kumaş maliyeti
        trimCost: trimCost,                       // Aksesuar maliyeti
        laborCost: laborCost,                     // İşçilik maliyeti
        embroideryCost: embroideryCost            // Nakış maliyeti
      }
    };
  }
  
  /**
   * Random geçen sezon verisi oluştur (PLM'siz - POC için)
   * @returns {Object} Random geçen sezon verisi
   */
  generateRandomPastSeasonData() {
    console.log('✅ Random POC verisi oluşturuluyor (PLM bağlantısı yok)');
    
    // Maliyetleri hesapla (FOB = tümünün toplamı)
    const fabricCost = this.randomDecimal(15, 35);        // Kumaş: en büyük maliyet
    const laborCost = this.randomDecimal(8, 18);          // İşçilik
    const trimCost = this.randomDecimal(2, 6);            // Aksesuar
    const embroideryCost = this.randomDecimal(0, 5);      // Nakış (opsiyonel)
    const fobCostUSD = parseFloat((fabricCost + laborCost + trimCost + embroideryCost).toFixed(2));
    
    // ROS (Rate of Sale) belirle - tekstil perakendeciliğinde %65-90 arası normal
    const ros = this.randomDecimal(65, 90);
    
    // Markdown - ROS ile ters orantılı
    let markdown;
    if (ros >= 85) {
      markdown = this.randomDecimal(5, 20);      // Çok iyi satıyor, az indirim
    } else if (ros >= 75) {
      markdown = this.randomDecimal(15, 30);     // İyi satıyor, orta indirim
    } else {
      markdown = this.randomDecimal(25, 45);     // Zor satıyor, yüksek indirim
    }
    
    // Sellout - ROS'a göre belirle
    const baseQty = this.randomInt(100, 300);
    const sellout = Math.round(baseQty * (ros / 100));
    
    // Satış performansını etiketle
    let salesPerformance;
    if (ros >= 85 && markdown <= 20) {
      salesPerformance = 'best';        // Çok iyi satıyor, az indirim
    } else if (ros >= 80 && markdown <= 25) {
      salesPerformance = 'excellent';   // Mükemmel performans
    } else if (ros >= 75 && markdown <= 30) {
      salesPerformance = 'good';        // İyi performans
    } else if (ros >= 70 && markdown <= 35) {
      salesPerformance = 'average';     // Orta performans
    } else if (ros >= 65) {
      salesPerformance = 'below average'; // Orta altı
    } else {
      salesPerformance = 'poor';        // Kötü performans
    }
    
    return {
      data: {
        sellout: sellout,
        markdown: markdown,
        ros: ros,
        salesPerformance: salesPerformance,
        fobCostUSD: fobCostUSD,
        fabricCost: fabricCost,
        trimCost: trimCost,
        laborCost: laborCost,
        embroideryCost: embroideryCost
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

