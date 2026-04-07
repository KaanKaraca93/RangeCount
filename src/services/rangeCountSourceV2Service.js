const XLSX = require('xlsx');
const axios = require('axios');
const path = require('path');
const tokenService = require('./tokenService');
const PLM_CONFIG = require('../config/plm.config');

const EXCLUDED_THEME_IDS = new Set([1172, 1240, 1239, 1169, 1168, 1167, 1166]);

/**
 * Eşleştirmede kullanılan GlRefId → PLM alan mapping'i
 *
 * type açıklamaları:
 *   'style'        → style.<plmField>.Id ile karşılaştır
 *   'style_direct' → style.<plmField> ile doğrudan integer karşılaştır (expand edilmemiş)
 *   'colorway'     → colorway.<plmField>.Id ile karşılaştır (CUD4 gibi)
 *   'colorway_int' → colorway.<plmField> ile doğrudan integer karşılaştır (CUD1 gibi)
 *
 * Faz: GlRefId'si yok, PLM'de hangi field olduğu kullanıcı onayı bekleniyor.
 *      Onaylanınca matchPlaceholder içindeki FAZ_FIELD sabiti güncellenecek.
 */
const MATCHING_GLREFIDS = {
  1:   { field: 'brandId',         type: 'style',        plmField: 'Brand' },
  58:  { field: 'seasonId',        type: 'style_direct', plmField: 'SeasonId' },   // style.SeasonId (integer)
  65:  { field: 'subCategoryId',   type: 'style',        plmField: 'SubCategory' },
  69:  { field: 'subSubCategoryId',type: 'style',        plmField: 'ProductSubSubCategory' },
  224: { field: 'fashionPyramidId',type: 'colorway_int', plmField: 'ColorwayUserField1' },  // integer, doğrudan karşılaştır
  227: { field: 'lifeStyleGrupId', type: 'colorway',     plmField: 'ColorwayUserDefinedField4' },
  232: { field: 'segmentId',       type: 'style',        plmField: 'UserDefinedField5' },
};

/**
 * Faz eşleştirmesi için PLM alanı (colorway üzerinde doğrudan text field)
 * Excel'deki "PLAN" / "SEMI PLAN" değeri bu field ile karşılaştırılır (name match, ID değil)
 */
const FAZ_FIELD = 'FreeFieldThree';

/**
 * Range Count Source V2 Service
 * Yeni Excel formatı: ID değil Name bazlı (örn. "IPEKYOL" → BrandId: 4)
 * GenericLookUpAll API ile name→ID çözümlemesi
 * CUD5 (FT) eşleştirmeden çıkarıldı
 * Season ve Faz raporlama alanı olarak eklendi
 */
class RangeCountSourceV2Service {
  constructor() {
    this.lookupCache = null;
    this.lookupCacheTime = null;
    this.CACHE_TTL = 24 * 60 * 60 * 1000; // 24 saat
  }

  /**
   * RangeSayacv4Name.xlsx'den plan satırlarını oku
   */
  readPlanData() {
    try {
      const workbook = XLSX.readFile(path.join(__dirname, '../../RangeSayacv4Name.xlsx'));
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      console.log(`✅ RangeSayacv4Name.xlsx: ${data.length} satır okundu`);
      return data;
    } catch (error) {
      console.error('❌ RangeSayacv4Name.xlsx okuma hatası:', error.message);
      throw error;
    }
  }

  /**
   * Sütun adlarından GlRefId → kolonAdı mapping'i çıkar
   * Örn: "1_MARKA" → { 1: "1_MARKA", 65: "65_ÜRÜN GRUBU", ... }
   */
  detectGlRefIdColumns(firstRow) {
    const columns = {};
    Object.keys(firstRow).forEach(col => {
      const match = col.match(/^(\d+)_/);
      if (match) {
        columns[parseInt(match[1])] = col;
      }
    });
    console.log(`🔍 Tespit edilen GlRefId sütunları:`, columns);
    return columns;
  }

  /**
   * PLM GenericLookUpAll'dan name→GlValId map'i çek
   * Cache: 24 saat
   */
  async fetchGenericLookups(glrefIds) {
    if (
      this.lookupCache &&
      this.lookupCacheTime &&
      Date.now() - this.lookupCacheTime < this.CACHE_TTL
    ) {
      console.log('📦 GenericLookUpAll cache\'den kullanılıyor');
      return this.lookupCache;
    }

    try {
      const authHeader = await tokenService.getAuthorizationHeader();
      const url = `${PLM_CONFIG.ionApiUrl}/${PLM_CONFIG.tenantId}/FASHIONPLM/odata2/api/odata2/GenericLookUpAll/GetAllLookups`;

      const params = {
        '$filter': `GlrefId in [${glrefIds.join(',')}]`,
        '$count': 'true',
        'language': 'tr-tr'
      };

      console.log(`📞 GenericLookUpAll çekiliyor: GlRefId in [${glrefIds.join(',')}]`);

      const response = await axios.get(url, {
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
        params
      });

      const items = response.data.value || [];
      console.log(`✅ ${items.length} lookup değeri çekildi`);

      // { GlrefId: { "IPEKYOL": 4, "TWIST": 8, ... } }
      const lookupMap = {};

      items.forEach(item => {
        const glrefId = item.GlrefId;
        const glValId = item.GlValId;

        // Türkçe çeviri varsa onu kullan, yoksa ana Name
        // PLM 'tr-TR' döndürür, case-insensitive karşılaştır
        let displayName = item.Name;
        if (item.Translations && item.Translations.length > 0) {
          const tr = item.Translations.find(t =>
            t.Culture && t.Culture.toLowerCase() === 'tr-tr' &&
            t.Name && t.Name.trim() !== ''
          );
          if (tr) displayName = tr.Name;
        }

        if (!lookupMap[glrefId]) lookupMap[glrefId] = {};

        // Hem Türkçe hem İngilizce name'i ekle (büyük/küçük harf duyarsız)
        lookupMap[glrefId][displayName.trim().toUpperCase()] = glValId;
        if (item.Name && item.Name.trim().toUpperCase() !== displayName.trim().toUpperCase()) {
          lookupMap[glrefId][item.Name.trim().toUpperCase()] = glValId;
        }
      });

      this.lookupCache = lookupMap;
      this.lookupCacheTime = Date.now();

      // Debug: her GlRefId için kaç değer var
      Object.entries(lookupMap).forEach(([gid, vals]) => {
        console.log(`   GlRefId ${gid}: ${Object.keys(vals).length} değer`);
      });

      return lookupMap;
    } catch (error) {
      console.error('❌ GenericLookUpAll hatası:', error.message);
      throw error;
    }
  }

  /**
   * Tek Excel satırındaki name değerlerini PLM ID'lerine çöz
   * Eşleşemeyen herhangi bir alan varsa → null döner (satır atlanır)
   * Orijinal isimleri de _name suffix ile sakla (output'ta kullanmak için)
   */
  resolveRowIds(row, glRefIdColumns, lookupMap) {
    const resolved = {
      opsiyonKodu: row['Opsiyon Kodu'] || null,
      season: row['58_Season'] || null,        // string, eşleştirme kriteri değil
      faz: row['Faz'] || row['Phase'] || null, // string, eşleştirme kriteri değil
    };

    // Sadece MATCHING_GLREFIDS'teki alanları çöz
    for (const [glRefId, columnName] of Object.entries(glRefIdColumns)) {
      const glRefIdInt = parseInt(glRefId);

      // Eşleştirme kriteri olmayan sütunları (Faz vb.) atla
      if (!MATCHING_GLREFIDS[glRefIdInt]) continue;

      const fieldDef = MATCHING_GLREFIDS[glRefIdInt];
      const nameValue = row[columnName];

      // Boş hücre = bu alan için wildcard (null = her şeyle eşleş)
      if (nameValue === undefined || nameValue === null || nameValue === '') {
        resolved[fieldDef.field] = null;
        resolved[`${fieldDef.field}_name`] = null;
        continue;
      }

      const nameStr = String(nameValue).trim();
      const nameUpper = nameStr.toUpperCase();
      const idMap = lookupMap[glRefIdInt];

      if (!idMap) {
        console.warn(`⚠️ GlRefId ${glRefId} için lookup verisi yok — satır atlanıyor`);
        return null;
      }

      const resolvedId = idMap[nameUpper];

      if (resolvedId === undefined) {
        console.warn(`⚠️ "${nameValue}" (GlRefId=${glRefId}) lookup'ta bulunamadı — satır atlanıyor`);
        return null;
      }

      resolved[fieldDef.field] = resolvedId;
      resolved[`${fieldDef.field}_name`] = nameStr; // Orijinal isim (output için)
    }

    return resolved;
  }

  /**
   * PLM'den style ve colorway verilerini çek
   * Değişiklikler v1'e göre:
   *   - CUD5 (ColorwayUserDefinedField5) kaldırıldı
   *   - SeasonId filtresi kaldırıldı (tüm aktif sezonlar)
   *   - Season expand eklendi (raporlama için)
   *   - theme expand eklendi (Faz tespiti için)
   */
  async fetchStylesFromPLM() {
    try {
      const authHeader = await tokenService.getAuthorizationHeader();
      const url = `${PLM_CONFIG.ionApiUrl}/${PLM_CONFIG.tenantId}/FASHIONPLM/odata2/api/odata2/Style`;

      const params = {
        '$filter': 'IsDeleted eq 0 and Status ne 103 and Status ne 1 and BrandId in (4,8) and DivisionId eq 6',
        '$select': 'StyleId,StyleCode,SeasonId',
        '$expand': [
          'Brand($select=Id,Name)',
          'SubCategory($select=Id,Name)',
          'ProductSubSubCategory($select=Id,Name)',
          'UserDefinedField5($select=Id,Name)',
          'Season($select=Id,Name,Code)',
          'MarketField3($select=Id,Name)',
          'StyleExtendedFieldValues($select=StyleId,Id,ExtFldId,NumberValue;$filter=ExtFldId eq a21b2b14-8ca3-49f2-8e80-b12823bf14a2 or ExtFldId eq 79cb5b20-3028-44d4-a85e-ed18c00af3c8;$expand=StyleExtendedFields($select=Name))',
          // CUD5 (ColorwayUserDefinedField5) kaldırıldı — FreeFieldThree eklendi (Faz)
          'StyleColorways($select=StyleColorwayId,Code,Name,ColorwayUserField1,FreeFieldOne,FreeFieldFive,FreeFieldThree;$expand=ColorwayUserDefinedField4($select=Id,Name),Theme($select=Id,Name,Code);$filter=ColorwayStatus ne 4)'
        ].join(',')
      };

      console.log(`📞 PLM'den style verileri çekiliyor (V2)...`);
      console.log(`🔍 Filter: ${params['$filter']}`);

      const response = await axios.get(url, {
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
        params
      });

      const styles = response.data.value || [];
      console.log(`✅ PLM'den ${styles.length} style çekildi`);

      let totalColorways = 0;
      styles.forEach(s => { totalColorways += s.StyleColorways?.length || 0; });
      console.log(`📊 Toplam ${totalColorways} colorway`);

      return styles;
    } catch (error) {
      console.error('❌ PLM style fetch hatası:', error.message);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', JSON.stringify(error.response.data).substring(0, 300));
      }
      throw error;
    }
  }

  /**
   * Extended field değerini çıkar (Hedef MarkUp, Alım Hedef Fiyatı vb.)
   */
  getExtendedFieldValue(style, extFldId) {
    if (!style.StyleExtendedFieldValues || !Array.isArray(style.StyleExtendedFieldValues)) return null;
    const field = style.StyleExtendedFieldValues.find(f => f.ExtFldId === extFldId);
    if (!field || !field.NumberValue) return null;
    return typeof field.NumberValue === 'string' ? parseFloat(field.NumberValue) : field.NumberValue;
  }

  /**
   * Colorway ile placeholder eşleştirme (CUD5 olmadan, Season+Faz eklendi)
   * Null alan = wildcard (her değerle eşleşir)
   */
  matchPlaceholder(placeholder, style, colorway) {
    // ── Hariç tutma kuralları ──────────────────────────────────────
    if (colorway.FreeFieldOne !== 'B') return false;        // Sadece B cluster
    if (colorway.Theme && EXCLUDED_THEME_IDS.has(colorway.Theme.Id)) return false; // İptal tema

    // ── Eşleştirme kriterleri ──────────────────────────────────────

    // Brand (GlRefId=1)
    if (placeholder.brandId !== null && !(style.Brand && style.Brand.Id === placeholder.brandId)) return false;

    // Season (GlRefId=58) — style.SeasonId doğrudan integer
    if (placeholder.seasonId !== null && style.SeasonId !== placeholder.seasonId) return false;

    // SubCategory / Ürün Grubu (GlRefId=65)
    if (placeholder.subCategoryId !== null && !(style.SubCategory && style.SubCategory.Id === placeholder.subCategoryId)) return false;

    // SubSubCategory / Ürün Alt Grubu (GlRefId=69)
    if (placeholder.subSubCategoryId !== null && !(style.ProductSubSubCategory && style.ProductSubSubCategory.Id === placeholder.subSubCategoryId)) return false;

    // Fashion Pyramid / CUD1 (GlRefId=224) — ColorwayUserField1 integer
    if (placeholder.fashionPyramidId !== null && colorway.ColorwayUserField1 !== placeholder.fashionPyramidId) return false;

    // Life Style Group / CUD4 (GlRefId=227)
    if (placeholder.lifeStyleGrupId !== null && !(colorway.ColorwayUserDefinedField4 && colorway.ColorwayUserDefinedField4.Id === placeholder.lifeStyleGrupId)) return false;

    // Segment / UDF5 (GlRefId=232)
    if (placeholder.segmentId !== null && !(style.UserDefinedField5 && style.UserDefinedField5.Id === placeholder.segmentId)) return false;

    // Faz — colorway.FreeFieldThree ile name match (ID değil)
    if (FAZ_FIELD !== null && placeholder.faz !== null) {
      const plmFaz = colorway[FAZ_FIELD] || null;
      if (plmFaz !== placeholder.faz) return false;
    }

    return true;
  }

  /**
   * Ana metod: Placeholder'ları PLM colorway'leriyle eşleştir
   */
  async matchColorwaysToPlaceholders() {
    console.log('\n🚀 Range Count Source V2 başlatılıyor...');

    // 1. Excel oku
    const rawData = this.readPlanData();
    if (!rawData || rawData.length === 0) throw new Error('Excel boş veya okunamadı');

    // 2. GlRefId sütunlarını tespit et
    const glRefIdColumns = this.detectGlRefIdColumns(rawData[0]);
    const allGlrefIds = Object.keys(glRefIdColumns).map(Number);

    // 3. Lookup'ları çek (sadece matching olanlar için gerekli ama hepsini çek)
    const matchingGlrefIds = allGlrefIds.filter(id => MATCHING_GLREFIDS[id]);
    const lookupMap = await this.fetchGenericLookups(matchingGlrefIds);

    // 4. Her Excel satırını çözümle → placeholder listesi
    const placeholders = [];
    let skippedCount = 0;

    rawData.forEach((row, idx) => {
      const resolved = this.resolveRowIds(row, glRefIdColumns, lookupMap);
      if (!resolved) {
        skippedCount++;
        return;
      }
      placeholders.push(resolved);
    });

    console.log(`\n📋 Plan: ${rawData.length} satır okundu`);
    console.log(`   ✅ Çözümlenen: ${placeholders.length}`);
    console.log(`   ⚠️  Atlanan (lookup başarısız): ${skippedCount}`);

    // 5. PLM'den style'ları çek
    const plmStyles = await this.fetchStylesFromPLM();

    // 6. Eşleştirme
    const results = [];
    const matchedColorwayIds = new Set();

    console.log(`\n🔄 ${placeholders.length} placeholder için eşleştirme yapılıyor...`);

    for (const placeholder of placeholders) {
      let foundMatch = false;

      for (const style of plmStyles) {
        if (foundMatch) break;
        if (!style.StyleColorways || !Array.isArray(style.StyleColorways)) continue;

        for (const colorway of style.StyleColorways) {
          if (!colorway) continue;
          if (matchedColorwayIds.has(colorway.StyleColorwayId)) continue;

          if (this.matchPlaceholder(placeholder, style, colorway)) {
            matchedColorwayIds.add(colorway.StyleColorwayId);
            foundMatch = true;

            results.push({
              // Plan bilgileri
              opsiyonKodu: placeholder.opsiyonKodu,
              season: placeholder.season,
              faz: placeholder.faz,

              // Boyutlar (plan'daki isimler _name suffix'li alanlardan, PLM'den doğrulananlar doğrudan)
              marka: style.Brand?.Name || placeholder.brandId_name || null,
              brandId: placeholder.brandId,
              urunGrubu: style.SubCategory?.Name || placeholder.subCategoryId_name || null,
              subCategoryId: placeholder.subCategoryId,
              urunAltGrup: style.ProductSubSubCategory?.Name || placeholder.subSubCategoryId_name || null,
              subSubCategoryId: placeholder.subSubCategoryId,
              fashionPyramid: placeholder.fashionPyramidId_name || null,
              fashionPyramidId: placeholder.fashionPyramidId,
              lifeStyleGrup: colorway.ColorwayUserDefinedField4?.Name || placeholder.lifeStyleGrupId_name || null,
              lifeStyleGrupId: placeholder.lifeStyleGrupId,
              segment: style.UserDefinedField5?.Name || placeholder.segmentId_name || null,
              segmentId: placeholder.segmentId,

              // Plan vs Gerçekleşen
              planOptionSay: 1,
              gerceklesenOptionSay: 1,

              // Eşleşen ürün bilgileri
              gerceklesenStyleId: style.StyleId,
              gerceklesenUrunKodu: style.StyleCode,
              gerceklesenRenkKodu: colorway.Code,
              gerceklesenRenkAdi: colorway.Name,
              gerceklesenFreeFieldFive: colorway.FreeFieldFive || null,

              // Raporlama alanları (PLM'den)
              gerceklesenSezon: style.Season?.Name || null,
              gerceklesenSezonId: style.SeasonId || null,
              gerceklesenFaz: colorway.FreeFieldThree || null,
              gerceklesenThemeId: colorway.Theme?.Id || null,
              gerceklesenThemeName: colorway.Theme?.Name || null,
              gerceklesenThemeCode: colorway.Theme?.Code || null,

              // Finansal alanlar
              psf: style.MarketField3?.Name || null,
              hedefMarkUp: this.getExtendedFieldValue(style, 'a21b2b14-8ca3-49f2-8e80-b12823bf14a2'),
              alimHedefFiyati: this.getExtendedFieldValue(style, '79cb5b20-3028-44d4-a85e-ed18c00af3c8'),
            });
            break;
          }
        }
      }

      if (!foundMatch) {
        results.push({
          opsiyonKodu: placeholder.opsiyonKodu,
          season: placeholder.season,
          faz: placeholder.faz,
          marka: placeholder.brandId_name || null,
          brandId: placeholder.brandId,
          urunGrubu: placeholder.subCategoryId_name || null,
          subCategoryId: placeholder.subCategoryId,
          urunAltGrup: placeholder.subSubCategoryId_name || null,
          subSubCategoryId: placeholder.subSubCategoryId,
          fashionPyramid: placeholder.fashionPyramidId_name || null,
          fashionPyramidId: placeholder.fashionPyramidId,
          lifeStyleGrup: placeholder.lifeStyleGrupId_name || null,
          lifeStyleGrupId: placeholder.lifeStyleGrupId,
          segment: placeholder.segmentId_name || null,
          segmentId: placeholder.segmentId,
          planOptionSay: 1,
          gerceklesenOptionSay: 0,
          gerceklesenStyleId: null,
          gerceklesenUrunKodu: null,
          gerceklesenRenkKodu: null,
          gerceklesenRenkAdi: null,
          gerceklesenFreeFieldFive: null,
          gerceklesenSezon: null,
          gerceklesenSezonId: null,
          gerceklesenFaz: null,
          gerceklesenThemeId: null,
          gerceklesenThemeName: null,
          gerceklesenThemeCode: null,
          psf: null,
          hedefMarkUp: null,
          alimHedefFiyati: null,
        });
      }
    }

    const eslesen = results.filter(r => r.gerceklesenOptionSay === 1).length;
    const eslesmeyen = results.filter(r => r.gerceklesenOptionSay === 0).length;
    console.log(`\n✅ Eşleştirme tamamlandı:`);
    console.log(`   Plan=1 / Gerçekleşen=1 (Eşleşen): ${eslesen}`);
    console.log(`   Plan=1 / Gerçekleşen=0 (Eşleşmeyen): ${eslesmeyen}`);
    console.log(`   Toplam sonuç: ${results.length}`);

    return results;
  }

  /**
   * Özet istatistikler
   */
  calculateSummary(data) {
    const toplamPlanlanan = data.reduce((s, r) => s + r.planOptionSay, 0);
    const toplamGerceklesen = data.reduce((s, r) => s + r.gerceklesenOptionSay, 0);

    // Faz bazlı özet
    const fazlar = [...new Set(data.map(r => r.faz).filter(Boolean))];
    const fazBazinda = fazlar.map(faz => {
      const rows = data.filter(r => r.faz === faz);
      const plan = rows.reduce((s, r) => s + r.planOptionSay, 0);
      const gercek = rows.reduce((s, r) => s + r.gerceklesenOptionSay, 0);
      return { faz, plan, gerceklesen: gercek, fark: plan - gercek, oran: plan > 0 ? `${Math.round((gercek / plan) * 100)}%` : '0%' };
    });

    // Season bazlı özet
    const sezonlar = [...new Set(data.map(r => r.season).filter(Boolean))];
    const sezonBazinda = sezonlar.map(season => {
      const rows = data.filter(r => r.season === season);
      const plan = rows.reduce((s, r) => s + r.planOptionSay, 0);
      const gercek = rows.reduce((s, r) => s + r.gerceklesenOptionSay, 0);
      return { season, plan, gerceklesen: gercek, fark: plan - gercek, oran: plan > 0 ? `${Math.round((gercek / plan) * 100)}%` : '0%' };
    });

    return {
      toplamPlanlanan,
      toplamGerceklesen,
      fark: toplamPlanlanan - toplamGerceklesen,
      eslesen: data.filter(r => r.gerceklesenOptionSay === 1).length,
      sadecePlanlanan: data.filter(r => r.gerceklesenOptionSay === 0).length,
      toplamKayit: data.length,
      fazBazinda,
      sezonBazinda,
    };
  }

  /**
   * Lookup cache'i temizle (yeni PLM verisi için)
   */
  clearLookupCache() {
    this.lookupCache = null;
    this.lookupCacheTime = null;
    console.log('🗑️ GenericLookUpAll cache temizlendi');
  }
}

module.exports = new RangeCountSourceV2Service();
