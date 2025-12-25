const axios = require('axios');
const XLSX = require('xlsx');
const path = require('path');
const tokenService = require('./tokenService');
const PLM_CONFIG = require('../config/plm.config');

/**
 * PLM Range Service
 * Excel'den ID mapping okuyup PLM'den gerçek veri çeker
 */
class PlmRangeService {
  constructor() {
    this.planData = null;
    this.loadPlanData();
  }

  /**
   * Excel'den plan verilerini yükle (ID mapping ile)
   */
  loadPlanData() {
    try {
      const workbook = XLSX.readFile(path.join(__dirname, '../../RangeSayacv2.xlsx'));
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      this.planData = XLSX.utils.sheet_to_json(worksheet);
      
      console.log('✅ Plan verisi yüklendi (v2):', this.planData.length, 'satır');
    } catch (error) {
      console.error('❌ Excel yüklenirken hata:', error.message);
      this.planData = [];
    }
  }

  /**
   * PLM'den style verilerini çek
   */
  async fetchStylesFromPLM() {
    try {
      const authHeader = await tokenService.getAuthorizationHeader();
      
      const url = `${PLM_CONFIG.ionApiUrl}/ATJZAMEWEF5P4SNV_TST/FASHIONPLM/odata2/api/odata2/Style`;
      const params = {
        '$filter': 'SeasonId eq 1 and Status ne 103',
        '$select': 'StyleId,StyleCode,BrandId,DivisionId,ProductSubSubCategoryId,Status,SeasonId',
        '$expand': 'StyleColorways($select=Code,Name,ColorwayUserField4)'
      };
      
      console.log(`📞 PLM'den style verileri çekiliyor...`);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        params: params
      });
      
      console.log(`✅ PLM'den ${response.data.value?.length || 0} style çekildi`);
      return response.data.value || [];
      
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
   * PLM verilerini Excel'deki gruplara göre hesapla
   */
  async calculateRangeFromPLM() {
    try {
      // PLM'den verileri çek
      const plmStyles = await this.fetchStylesFromPLM();
      
      // Her plan satırı için hesapla
      const results = this.planData.map(planRow => {
        return this.calculateRowFromPLM(planRow, plmStyles);
      });
      
      return results;
      
    } catch (error) {
      console.error('❌ Range hesaplama hatası:', error.message);
      throw error;
    }
  }

  /**
   * Bir satır için PLM verilerinden hesapla
   */
  calculateRowFromPLM(planRow, plmStyles) {
    const {
      Marka_Id,
      Kategori_Id,
      LifeStyleGrup_Id,
      UrunAltGrup_Id,
      P_Opt
    } = planRow;

    let tOpt = 0;  // Status = 1 olanlar (taslak)
    let gOpt = 0;  // Status != 1 olanlar (gerçekleşen)

    // PLM'deki her style için
    for (const style of plmStyles) {
      // BrandId, DivisionId, ProductSubSubCategoryId kontrolü
      if (style.BrandId !== Marka_Id || 
          style.DivisionId !== Kategori_Id || 
          style.ProductSubSubCategoryId !== UrunAltGrup_Id) {
        continue;
      }

      // StyleColorways içinde ColorwayUserField4 kontrolü
      if (style.StyleColorways && style.StyleColorways.length > 0) {
        for (const colorway of style.StyleColorways) {
          // Tüm alanlar dolu olmalı
          if (style.BrandId === null || style.BrandId === undefined ||
              style.DivisionId === null || style.DivisionId === undefined ||
              style.ProductSubSubCategoryId === null || style.ProductSubSubCategoryId === undefined ||
              colorway.ColorwayUserField4 === null || colorway.ColorwayUserField4 === undefined) {
            continue;  // Bir alan bile null ise bu option yok hükmünde
          }

          // LifeStyleGrup_Id kontrolü
          if (colorway.ColorwayUserField4 !== LifeStyleGrup_Id) {
            continue;
          }

          // Status kontrolü
          if (style.Status === 1) {
            tOpt++;  // Taslak
          } else {
            gOpt++;  // Gerçekleşen
          }
        }
      }
    }

    // Hesaplamalar
    const fark = P_Opt - gOpt;
    const oran = P_Opt > 0 ? Math.round((gOpt / P_Opt) * 100) : 0;

    return {
      marka: planRow.Marka,
      kategori: planRow.Kategori,
      lifeStyleGrup: planRow.LifeStyleGrup,
      urunAltGrup: planRow.ÜrünAltGrup,
      pOpt: P_Opt,
      tOpt: tOpt,
      gOpt: gOpt,
      fark: fark,
      oran: `${oran}%`
    };
  }

  /**
   * Özet istatistikler
   */
  calculateSummary(rangeData) {
    const totalPOpt = rangeData.reduce((sum, row) => sum + row.pOpt, 0);
    const totalGOpt = rangeData.reduce((sum, row) => sum + row.gOpt, 0);
    const totalTOpt = rangeData.reduce((sum, row) => sum + row.tOpt, 0);
    const overallCompletion = totalPOpt > 0 ? Math.round((totalGOpt / totalPOpt) * 100) : 0;

    // Life Style Grup bazında
    const lifeStyleGroups = [...new Set(rangeData.map(row => row.lifeStyleGrup))];
    const groupSummaries = lifeStyleGroups.map(group => {
      const groupData = rangeData.filter(row => row.lifeStyleGrup === group);
      const groupPOpt = groupData.reduce((sum, row) => sum + row.pOpt, 0);
      const groupGOpt = groupData.reduce((sum, row) => sum + row.gOpt, 0);
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
}

// Singleton instance
const plmRangeService = new PlmRangeService();

module.exports = plmRangeService;

