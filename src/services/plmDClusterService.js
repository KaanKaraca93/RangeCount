const axios = require('axios');
const XLSX = require('xlsx');
const path = require('path');
const tokenService = require('./tokenService');
const PLM_CONFIG = require('../config/plm.config');

const EXCLUDED_THEME_IDS = new Set([1172, 1240, 1239, 1169, 1168, 1167, 1166]);

/**
 * PLM D-Cluster Service
 * D Cluster (FreeFieldOne='D') ürünlerini tema ve alt kategoriye göre sayar
 */
class PlmDClusterService {
  constructor() {
    this.planData = null;
    this.loadPlanData();
  }

  /**
   * Excel'den plan verilerini yükle
   */
  loadPlanData() {
    try {
      const workbook = XLSX.readFile(path.join(__dirname, '../../Dcluster.xlsx'));
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      this.planData = XLSX.utils.sheet_to_json(worksheet);
      
      // Toplam satırını filtrele (gerçek kategoriler için)
      this.planData = this.planData.filter(row => row.SubCategoryId !== 'TOPLAM');
      
      console.log('✅ D-Cluster plan verisi yüklendi:', this.planData.length, 'kategori');
    } catch (error) {
      console.error('❌ D-Cluster Excel yüklenirken hata:', error.message);
      this.planData = [];
    }
  }

  /**
   * PLM'den style verilerini çek (SubCategoryId dahil)
   */
  async fetchStylesFromPLM() {
    try {
      const authHeader = await tokenService.getAuthorizationHeader();
      
      const url = `${PLM_CONFIG.ionApiUrl}/${PLM_CONFIG.tenantId}/FASHIONPLM/odata2/api/odata2/Style`;
      const params = {
        '$filter': `SeasonId eq ${PLM_CONFIG.seasonId} and Status ne 103`,
        '$select': 'StyleId,StyleCode,BrandId,DivisionId,SubCategoryId,ProductSubSubCategoryId,Status,SeasonId',
        '$expand': 'StyleColorways($select=Code,Name,ColorwayUserField4,ThemeId,FreeFieldOne,ColorwayStatus)'
      };
      
      console.log(`📞 PLM'den D-Cluster style verileri çekiliyor...`);
      
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
   * ThemeId'ye göre dönem belirleme
   */
  getMonthGroup(themeId) {
    // AGU: ThemeId = 1118, 1119, 1120, 1125
    if ([1118, 1119, 1120, 1125].includes(themeId)) {
      return 'AGU';
    }
    // EYL: ThemeId = 1121, 1122, 1126
    if ([1121, 1122, 1126].includes(themeId)) {
      return 'EYL';
    }
    // EKM: ThemeId = 1123, 1124, 1127
    if ([1123, 1124, 1127].includes(themeId)) {
      return 'EKM';
    }
    return null; // Hiçbir gruba ait değil
  }

  /**
   * PLM verilerini hesapla
   */
  async calculateDClusterFromPLM() {
    try {
      // PLM'den verileri çek
      const plmStyles = await this.fetchStylesFromPLM();
      
      // Her kategori için hesapla
      const results = this.planData.map(planRow => {
        return this.calculateRowFromPLM(planRow, plmStyles);
      });
      
      // Toplam satırı ekle
      const totalRow = this.calculateTotalRow(results);
      results.unshift(totalRow); // Başa ekle
      
      return results;
      
    } catch (error) {
      console.error('❌ D-Cluster hesaplama hatası:', error.message);
      throw error;
    }
  }

  /**
   * Bir kategori için PLM verilerinden hesapla
   */
  calculateRowFromPLM(planRow, plmStyles) {
    const { SubCategoryId, AGU: planAGU, EYL: planEYL, EKM: planEKM, TOP: planTOP } = planRow;

    // Dönem bazında sayaçlar
    const counts = {
      AGU: { tOpt: 0, gOpt: 0 },
      EYL: { tOpt: 0, gOpt: 0 },
      EKM: { tOpt: 0, gOpt: 0 }
    };

    // PLM'deki her style için
    for (const style of plmStyles) {
      // SubCategoryId kontrolü
      if (style.SubCategoryId !== SubCategoryId) {
        continue;
      }

      // StyleColorways kontrolü
      if (style.StyleColorways && style.StyleColorways.length > 0) {
        for (const colorway of style.StyleColorways) {
          // 🚫 Exclude kuralları
          if (colorway.ColorwayStatus === 4) continue; // İptal
          if (EXCLUDED_THEME_IDS.has(colorway.ThemeId)) continue; // İptal tema
          if (colorway.FreeFieldOne !== 'D') continue; // Sadece D cluster

          // Null kontrolleri
          if (style.BrandId === null || style.BrandId === undefined ||
              style.DivisionId === null || style.DivisionId === undefined ||
              style.SubCategoryId === null || style.SubCategoryId === undefined ||
              style.ProductSubSubCategoryId === null || style.ProductSubSubCategoryId === undefined ||
              colorway.ColorwayUserField4 === null || colorway.ColorwayUserField4 === undefined ||
              colorway.ThemeId === null || colorway.ThemeId === undefined) {
            continue;
          }

          // ThemeId'ye göre dönem belirle
          const monthGroup = this.getMonthGroup(colorway.ThemeId);
          if (!monthGroup) continue; // Tanımlı tema gruplarına ait değilse sayma

          // Status kontrolü ve sayım
          if (style.Status === 1) {
            counts[monthGroup].tOpt++; // Taslak
          } else {
            counts[monthGroup].gOpt++; // Gerçekleşen
          }
        }
      }
    }

    // Hesaplamalar
    const aguTotal = counts.AGU.tOpt + counts.AGU.gOpt;
    const eylTotal = counts.EYL.tOpt + counts.EYL.gOpt;
    const ekmTotal = counts.EKM.tOpt + counts.EKM.gOpt;
    const topTotal = aguTotal + eylTotal + ekmTotal;

    const aguFark = aguTotal - planAGU;
    const eylFark = eylTotal - planEYL;
    const ekmFark = ekmTotal - planEKM;
    const topFark = topTotal - planTOP;

    const aguOran = planAGU > 0 ? Math.round((aguTotal / planAGU) * 100) : 0;
    const eylOran = planEYL > 0 ? Math.round((eylTotal / planEYL) * 100) : 0;
    const ekmOran = planEKM > 0 ? Math.round((ekmTotal / planEKM) * 100) : 0;
    const topOran = planTOP > 0 ? Math.round((topTotal / planTOP) * 100) : 0;

    return {
      subCategory: planRow.SubCategory,
      subCategoryId: SubCategoryId,
      agu: {
        plan: planAGU,
        tOpt: counts.AGU.tOpt,
        gOpt: counts.AGU.gOpt,
        total: aguTotal,
        fark: aguFark,
        oran: `${aguOran}%`
      },
      eyl: {
        plan: planEYL,
        tOpt: counts.EYL.tOpt,
        gOpt: counts.EYL.gOpt,
        total: eylTotal,
        fark: eylFark,
        oran: `${eylOran}%`
      },
      ekm: {
        plan: planEKM,
        tOpt: counts.EKM.tOpt,
        gOpt: counts.EKM.gOpt,
        total: ekmTotal,
        fark: ekmFark,
        oran: `${ekmOran}%`
      },
      top: {
        plan: planTOP,
        total: topTotal,
        fark: topFark,
        oran: `${topOran}%`
      }
    };
  }

  /**
   * Toplam satırını hesapla
   */
  calculateTotalRow(results) {
    const totals = {
      aguPlan: 0,
      aguTOpt: 0,
      aguGOpt: 0,
      eylPlan: 0,
      eylTOpt: 0,
      eylGOpt: 0,
      ekmPlan: 0,
      ekmTOpt: 0,
      ekmGOpt: 0,
      topPlan: 0
    };

    // Tüm kategorileri topla
    results.forEach(row => {
      totals.aguPlan += row.agu.plan;
      totals.aguTOpt += row.agu.tOpt;
      totals.aguGOpt += row.agu.gOpt;
      totals.eylPlan += row.eyl.plan;
      totals.eylTOpt += row.eyl.tOpt;
      totals.eylGOpt += row.eyl.gOpt;
      totals.ekmPlan += row.ekm.plan;
      totals.ekmTOpt += row.ekm.tOpt;
      totals.ekmGOpt += row.ekm.gOpt;
      totals.topPlan += row.top.plan;
    });

    const aguTotal = totals.aguTOpt + totals.aguGOpt;
    const eylTotal = totals.eylTOpt + totals.eylGOpt;
    const ekmTotal = totals.ekmTOpt + totals.ekmGOpt;
    const topTotal = aguTotal + eylTotal + ekmTotal;

    const aguFark = aguTotal - totals.aguPlan;
    const eylFark = eylTotal - totals.eylPlan;
    const ekmFark = ekmTotal - totals.ekmPlan;
    const topFark = topTotal - totals.topPlan;

    const aguOran = totals.aguPlan > 0 ? Math.round((aguTotal / totals.aguPlan) * 100) : 0;
    const eylOran = totals.eylPlan > 0 ? Math.round((eylTotal / totals.eylPlan) * 100) : 0;
    const ekmOran = totals.ekmPlan > 0 ? Math.round((ekmTotal / totals.ekmPlan) * 100) : 0;
    const topOran = totals.topPlan > 0 ? Math.round((topTotal / totals.topPlan) * 100) : 0;

    return {
      subCategory: "Toplam",
      subCategoryId: null,
      agu: {
        plan: totals.aguPlan,
        tOpt: totals.aguTOpt,
        gOpt: totals.aguGOpt,
        total: aguTotal,
        fark: aguFark,
        oran: `${aguOran}%`
      },
      eyl: {
        plan: totals.eylPlan,
        tOpt: totals.eylTOpt,
        gOpt: totals.eylGOpt,
        total: eylTotal,
        fark: eylFark,
        oran: `${eylOran}%`
      },
      ekm: {
        plan: totals.ekmPlan,
        tOpt: totals.ekmTOpt,
        gOpt: totals.ekmGOpt,
        total: ekmTotal,
        fark: ekmFark,
        oran: `${ekmOran}%`
      },
      top: {
        plan: totals.topPlan,
        total: topTotal,
        fark: topFark,
        oran: `${topOran}%`
      }
    };
  }
}

// Singleton instance
const plmDClusterService = new PlmDClusterService();

module.exports = plmDClusterService;
