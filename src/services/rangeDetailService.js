const XLSX = require('xlsx');
const path = require('path');

/**
 * Range Detail Service
 * Excel'den detay verilerini (kumaş tipi, açıklama) okur
 */
class RangeDetailService {
  constructor() {
    this.data = null;
    this.loadData();
  }

  /**
   * Excel dosyasını yükle
   */
  loadData() {
    try {
      const workbook = XLSX.readFile(path.join(__dirname, '../../RangeDetay.xlsx'));
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

      this.data = rawData;
      console.log('✅ Range detay verisi yüklendi:', this.data.length, 'satır');
    } catch (error) {
      console.error('❌ Range detay Excel yüklenirken hata:', error.message);
      this.data = [];
    }
  }

  /**
   * Tüm detay verilerini getir
   */
  getAllDetails() {
    return this.data || [];
  }

  /**
   * Life Style Grup'a göre filtrele
   */
  getByLifeStyleGroup(group) {
    return this.data.filter(row => row['Life Style Grup'] === group);
  }

  /**
   * Ürün Alt Grup'a göre filtrele
   */
  getByProductGroup(group) {
    return this.data.filter(row => row['Ürün Alt Grup'] === group);
  }

  /**
   * Kumaş Tipi'ne göre filtrele
   */
  getByFabricType(type) {
    return this.data.filter(row => row['Kumaş Tipi'] === type);
  }

  /**
   * Life Style ve Ürün Alt Grup'a göre detay
   */
  getDetail(lifeStyleGroup, productGroup) {
    return this.data.filter(row => 
      row['Life Style Grup'] === lifeStyleGroup && 
      row['Ürün Alt Grup'] === productGroup
    );
  }

  /**
   * Kumaş tipi bazında özet
   */
  getSummaryByFabric() {
    const fabricTypes = [...new Set(this.data.map(row => row['Kumaş Tipi']))];
    
    const summary = fabricTypes.map(fabric => {
      const fabricData = this.getByFabricType(fabric);
      const totalPlan = fabricData.reduce((sum, row) => sum + (row.PLAN || 0), 0);
      
      return {
        kumasTipi: fabric,
        toplamPlan: totalPlan,
        satirSayisi: fabricData.length
      };
    });

    return summary;
  }

  /**
   * Veriyi yeniden yükle
   */
  reload() {
    this.loadData();
  }
}

// Singleton instance
const rangeDetailService = new RangeDetailService();

module.exports = rangeDetailService;

