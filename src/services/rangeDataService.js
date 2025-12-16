const XLSX = require('xlsx');
const path = require('path');

/**
 * Range Data Service
 * Excel'den veriyi okur ve eksik alanları mantıklı şekilde doldurur
 */
class RangeDataService {
  constructor() {
    this.data = null;
    this.loadData();
  }

  /**
   * Excel dosyasını yükle ve işle
   */
  loadData() {
    try {
      const workbook = XLSX.readFile(path.join(__dirname, '../../RangeSayac.xlsx'));
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

      // Veriyi işle ve eksikleri doldur
      this.data = rawData.map(row => this.processRow(row));

      console.log('✅ Excel verisi yüklendi:', this.data.length, 'satır');
    } catch (error) {
      console.error('❌ Excel yüklenirken hata:', error.message);
      this.data = [];
    }
  }

  /**
   * Bir satırı işle ve eksik alanları doldur
   */
  processRow(row) {
    const P_Opt = row.P_Opt || 0;
    
    // G_Opt: P_Opt'tan küçük veya eşit olmalı (%100'ü geçmesin)
    let G_Opt = row.G_Opt;
    if (G_Opt === null || G_Opt === undefined) {
      // Random ama mantıklı: %60 - %100 arası tamamlanma
      const completionRate = 0.6 + Math.random() * 0.4; // 0.6 - 1.0
      G_Opt = Math.floor(P_Opt * completionRate);
    }
    
    // G_Opt asla P_Opt'u geçmesin
    if (G_Opt > P_Opt) {
      G_Opt = P_Opt;
    }

    // T_Opt: Taslak ürün sayısı (0-5 arası random)
    let T_Opt = row.T_Opt;
    if (T_Opt === null || T_Opt === undefined) {
      T_Opt = Math.floor(Math.random() * 6); // 0-5 arası
    }

    // Fark = P_Opt - G_Opt
    const Fark = P_Opt - G_Opt;

    // Oran = (G_Opt / P_Opt) - yüzde olarak hesapla
    const Oran = P_Opt > 0 ? Math.round((G_Opt / P_Opt) * 100) : 0;

    return {
      marka: row.Marka,
      kategori: row.Kategori,
      lifeStyleGrup: row['Life Style Grup'],
      urunAltGrup: row['Ürün Alt Grup'],
      pOpt: P_Opt,
      tOpt: T_Opt,
      gOpt: G_Opt,
      fark: Fark,
      oran: `${Oran}%`
    };
  }

  /**
   * Tüm veriyi getir
   */
  getAllData() {
    return this.data || [];
  }

  /**
   * Life Style Grup'a göre filtrele
   */
  getByLifeStyleGroup(group) {
    return this.data.filter(row => row.lifeStyleGrup === group);
  }

  /**
   * Ürün Alt Grup'a göre filtrele
   */
  getByProductGroup(group) {
    return this.data.filter(row => row.urunAltGrup === group);
  }

  /**
   * Özet istatistikler
   */
  getSummary() {
    const totalPOpt = this.data.reduce((sum, row) => sum + row.pOpt, 0);
    const totalGOpt = this.data.reduce((sum, row) => sum + parseInt(row.gOpt), 0);
    const totalTOpt = this.data.reduce((sum, row) => sum + row.tOpt, 0);
    const overallCompletion = totalPOpt > 0 ? Math.round((totalGOpt / totalPOpt) * 100) : 0;

    // Life Style Grup bazında özet
    const lifeStyleGroups = [...new Set(this.data.map(row => row.lifeStyleGrup))];
    const groupSummaries = lifeStyleGroups.map(group => {
      const groupData = this.getByLifeStyleGroup(group);
      const groupPOpt = groupData.reduce((sum, row) => sum + row.pOpt, 0);
      const groupGOpt = groupData.reduce((sum, row) => sum + parseInt(row.gOpt), 0);
      const completion = groupPOpt > 0 ? Math.round((groupGOpt / groupPOpt) * 100) : 0;

      return {
        grup: group,
        planlanan: groupPOpt,
        gerceklesen: groupGOpt,
        fark: groupPOpt - groupGOpt,
        tamamlanma: `${completion}%`
      };
    });

    return {
      genel: {
        toplamPlanlanan: totalPOpt,
        toplamGerceklesen: totalGOpt,
        toplamTaslak: totalTOpt,
        toplamFark: totalPOpt - totalGOpt,
        genelTamamlanma: `${overallCompletion}%`
      },
      grupBazinda: groupSummaries
    };
  }

  /**
   * Veriyi yeniden yükle
   */
  reload() {
    this.loadData();
  }
}

// Singleton instance
const rangeDataService = new RangeDataService();

module.exports = rangeDataService;

