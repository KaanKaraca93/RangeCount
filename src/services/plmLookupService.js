const axios = require('axios');
const tokenService = require('./tokenService');
const PLM_CONFIG = require('../config/plm.config');

/**
 * PLM GenericLookUpAll tabanlı isim çözümü.
 *
 * Neden gerekli:
 *   Çıktıdaki görünen isimler (Marka, Ürün Grubu, Life Style Grup, FT, Segment,
 *   Fashion Pyramid, Ürün Alt Grup) iki farklı kaynaktan (CostingDB plan metni ve
 *   canlı PLM `.Name`) gelince, PLM generic lookup dili değiştiğinde çıktı iki dilli
 *   oluyordu. Tek gerçek olan ID'lerdir; isimleri her zaman ID'den, PLM'in
 *   GenericLookUpAll `GetAllLookups?language=tr-tr` ucundan çözüyoruz:
 *     - Eşleştiğimiz anahtar `GlValId`'dir (BrandId, SubCategoryId, CUD1, CUD4,
 *       CUD5, UDF5Id ... hepsi GlValId ile aynı).
 *     - Gösterim ismi: `Translations` içinde `Culture = "tr-tr"` olan `Name`,
 *       yoksa kök (İngilizce) `Name`'e düşülür.
 *
 * GlrefId eşlemesi (IpekyolCostingDB/plmLookupService.js referansı):
 *   Marka=1, Ürün Grubu(SubCategory)=65, Ürün Alt Grup(SubSubCategory)=69,
 *   Fashion Pyramid(CUD1)=224, Life Style Grup(CUD4)=227, FT(CUD5)=228, Segment(UDF5)=232
 */

const GLREF_IDS = {
  brand: 1,           // MARKA / BrandId
  subCategory: 65,    // ÜRÜN GRUBU / SubCategoryId
  subSubCategory: 69, // Ürün Alt Grup / SubSubCategoryId
  fashionPyramid: 224,// Fashion Pyramid / CUD1
  lifeStyleGrup: 227, // Life Style Grup / CUD4
  koleksiyonTipi: 228,// FT / CUD5
  segment: 232,       // Segment / UDF5Id
  sezon: 58,          // Season / SeasonId (style-costing)
  division: 90,       // Division / DivisionId (style-costing)
  status: 5           // StyleStatus / Status (style-costing)
};

const LOOKUP_TTL_MS = 30 * 60 * 1000; // 30 dakika
let cache = null; // { loadedAt, maps }

// tr-tr çevirisi varsa onu, yoksa kök Name'i kullan.
function resolveTrName(item) {
  const tr = (item.Translations || []).find(
    (t) => (t.Culture || '').toLowerCase() === 'tr-tr'
  );
  return (tr && tr.Name) ? tr.Name : item.Name;
}

// Tek bir GlrefId için GlValId -> tr isim haritası çeker.
async function fetchLookupMap(glrefId) {
  const authHeader = await tokenService.getAuthorizationHeader();
  const url = `${PLM_CONFIG.ionApiUrl}/${PLM_CONFIG.tenantId}/FASHIONPLM/odata2/api/odata2/GenericLookUpAll/GetAllLookups`;

  const { data } = await axios.get(url, {
    headers: { Authorization: authHeader, Accept: 'application/json' },
    params: { '$filter': `GlrefId eq ${glrefId}`, language: 'tr-tr' }
  });

  const map = new Map();
  (data.value || []).forEach((item) => {
    if (item && item.GlValId != null) map.set(Number(item.GlValId), resolveTrName(item));
  });
  return map;
}

// Gerekli tüm lookup'ları (paralel) yükler, TTL boyunca cache'ler.
async function load() {
  if (cache && (Date.now() - cache.loadedAt) < LOOKUP_TTL_MS) return cache.maps;

  // Token'ı önce ısıt: aksi halde paralel lookup çağrıları aynı anda ayrı ayrı
  // token almaya çalışır (gereksiz istek). Bir kez alınca hepsi cache'ten kullanır.
  try { await tokenService.getAuthorizationHeader(); } catch (e) { /* fetchLookupMap tekrar dener */ }

  const kinds = Object.keys(GLREF_IDS);
  const maps = {};
  await Promise.all(kinds.map(async (k) => {
    try {
      maps[k] = await fetchLookupMap(GLREF_IDS[k]);
    } catch (err) {
      console.error(`❌ Lookup yüklenemedi (${k}/GlrefId ${GLREF_IDS[k]}): ${err.message}`);
      maps[k] = new Map();
    }
  }));

  cache = { loadedAt: Date.now(), maps };
  console.log(`✅ PLM tr-tr lookup yüklendi: ${kinds.map((k) => `${k}=${maps[k].size}`).join(', ')}`);
  return maps;
}

/**
 * ID'den tr ismi çözer. Bulunamazsa fallback döner (mevcut kaynak değeri).
 * @param {object} maps load()'tan dönen harita seti
 * @param {string} kind GLREF_IDS anahtarı (brand, subCategory, ...)
 * @param {number|string} id GlValId
 * @param {*} fallback lookup boşsa kullanılacak değer
 */
function name(maps, kind, id, fallback = null) {
  if (id === undefined || id === null || id === '') return fallback;
  const map = maps ? maps[kind] : null;
  const v = map ? map.get(Number(id)) : undefined;
  return (v !== undefined && v !== null && v !== '') ? v : fallback;
}

module.exports = { GLREF_IDS, load, name };
