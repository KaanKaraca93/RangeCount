const axios = require('axios');
const XLSX = require('xlsx');
const path = require('path');
const tokenService = require('./tokenService');
const PLM_CONFIG = require('../config/plm.config');

/**
 * PLM Theme Service
 * Excel'den tema hedeflerini okuyup PLM'den gerçek veri çeker
 */
class PlmThemeService {
  constructor() {
    this.themeTargets = null;
    this.loadThemeTargets();
  }

  /**
   * Excel'den tema hedeflerini yükle
   */
  loadThemeTargets() {
    try {
      const workbook = XLSX.readFile(path.join(__dirname, '../../RangeSayacv3.xlsx'));
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      this.themeTargets = XLSX.utils.sheet_to_json(worksheet);
      
      console.log('✅ Tema hedefleri yüklendi:', this.themeTargets.length, 'satır');
    } catch (error) {
      console.error('❌ Tema Excel yüklenirken hata:', error.message);
      this.themeTargets = [];
    }
  }

  /**
   * PLM'den style verilerini çek (tema bilgisi ile)
   */
  async fetchStylesWithThemesFromPLM() {
    try {
      const authHeader = await tokenService.getAuthorizationHeader();
      
      const url = `${PLM_CONFIG.ionApiUrl}/${PLM_CONFIG.tenantId}/FASHIONPLM/odata2/api/odata2/Style`;
      const params = {
        '$filter': `SeasonId eq ${PLM_CONFIG.seasonId} and Status ne 103`,
        '$select': 'StyleId,StyleCode,BrandId,DivisionId,ProductSubSubCategoryId,Status,SeasonId',
        '$expand': 'StyleColorways($select=Code,Name,ColorwayUserField4,ThemeId,FreeFieldOne,ColorwayStatus)'
      };
      
      console.log(`📞 PLM'den tema ile style verileri çekiliyor...`);
      
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
      console.error('❌ PLM tema isteği hatası:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data).substring(0, 500));
      }
      throw error;
    }
  }

  /**
   * PLM verilerinden tema bazlı hesaplama
   */
  async calculateThemeProgress() {
    try {
      // PLM'den verileri çek
      const plmStyles = await this.fetchStylesWithThemesFromPLM();
      
      // Her tema hedefi için hesapla
      const results = this.themeTargets.map(themeTarget => {
        return this.calculateThemeRow(themeTarget, plmStyles);
      });
      
      // Sezon Ortalaması ekle
      const totalPOpt = results.reduce((sum, row) => sum + row.pOpt, 0);
      const totalGOpt = results.reduce((sum, row) => sum + row.gOpt, 0);
      const totalTOpt = results.reduce((sum, row) => sum + row.tOpt, 0);
      const totalFark = totalPOpt - totalGOpt;
      const avgOran = totalPOpt > 0 ? Math.round((totalGOpt / totalPOpt) * 100) : 0;
      
      results.push({
        temaAdi: "SezonOrtalaması",
        temaId: null,
        pOpt: totalPOpt,
        tOpt: totalTOpt,
        gOpt: totalGOpt,
        fark: totalFark,
        oran: `${avgOran}%`
      });
      
      // Referans ekle (%100 tamamlanma)
      // pOpt = gOpt olacak şekilde dummy bir değer
      const referansPOpt = 100;
      results.push({
        temaAdi: "Referans",
        temaId: null,
        pOpt: referansPOpt,
        tOpt: 0,
        gOpt: referansPOpt,
        fark: 0,
        oran: "100%"
      });
      
      return results;
      
    } catch (error) {
      console.error('❌ Tema hesaplama hatası:', error.message);
      throw error;
    }
  }

  /**
   * Bir tema için PLM verilerinden hesapla
   */
  calculateThemeRow(themeTarget, plmStyles) {
    const { Tema_Id, P_Opt } = themeTarget;

    let tOpt = 0;  // Status = 1 olanlar (taslak)
    let gOpt = 0;  // Status != 1 olanlar (gerçekleşen)

    // PLM'deki her style için
    for (const style of plmStyles) {
      // StyleColorways içinde ThemeId kontrolü
      if (style.StyleColorways && style.StyleColorways.length > 0) {
        for (const colorway of style.StyleColorways) {
          // ThemeId kontrolü
          if (colorway.ThemeId === null || colorway.ThemeId === undefined) {
            continue;  // ThemeId null ise bu option yok hükmünde
          }

          // Tema eşleşmesi
          if (colorway.ThemeId !== Tema_Id) {
            continue;
          }

          // 🚫 ColorwayStatus = 4 olanları hariç tut (iptal)
          if (colorway.ColorwayStatus === 4) {
            continue;
          }

          // 🚫 ThemeId = 1172 olanları hariç tut (iptal)
          if (colorway.ThemeId === 1172) {
            continue;
          }

          // 🚫 FreeFieldOne = 'B' olmayanları hariç tut (cluster takibi)
          if (colorway.FreeFieldOne !== 'B') {
            continue;
          }

          // Diğer gerekli alanlar null olmamalı
          if (style.BrandId === null || style.BrandId === undefined ||
              style.DivisionId === null || style.DivisionId === undefined ||
              style.ProductSubSubCategoryId === null || style.ProductSubSubCategoryId === undefined ||
              colorway.ColorwayUserField4 === null || colorway.ColorwayUserField4 === undefined) {
            continue;  // Bir alan bile null ise bu option yok hükmünde
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
      temaAdi: themeTarget.TemaAdi,
      temaId: Tema_Id,
      pOpt: P_Opt,
      tOpt: tOpt,
      gOpt: gOpt,
      fark: fark,
      oran: `${oran}%`
    };
  }

  /**
   * Tema özet istatistikleri
   * SezonOrtalaması ve Referans kayıtlarını hariç tutar
   */
  calculateSummary(themeData) {
    // Sadece gerçek temaları filtrele (temaId != null olanlar)
    const realThemes = themeData.filter(row => row.temaId !== null);
    
    const totalPOpt = realThemes.reduce((sum, row) => sum + row.pOpt, 0);
    const totalGOpt = realThemes.reduce((sum, row) => sum + row.gOpt, 0);
    const totalTOpt = realThemes.reduce((sum, row) => sum + row.tOpt, 0);
    const overallCompletion = totalPOpt > 0 ? Math.round((totalGOpt / totalPOpt) * 100) : 0;

    return {
      toplamPlanlanan: totalPOpt,
      toplamGerceklesen: totalGOpt,
      toplamTaslak: totalTOpt,
      toplamFark: totalPOpt - totalGOpt,
      genelTamamlanma: `${overallCompletion}%`,
      temaSayisi: realThemes.length
    };
  }
}

// Singleton instance
const plmThemeService = new PlmThemeService();

module.exports = plmThemeService;

