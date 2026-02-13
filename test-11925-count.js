const axios = require('axios');

async function test11925() {
  try {
    const response = await axios.get('http://localhost:3037/api/range-v5');
    const rawData = response.data;
    
    // API response yapısını kontrol et
    const data = Array.isArray(rawData) ? rawData : (rawData.data || rawData.results || []);

    console.log('📊 StyleId 11925 için sonuçlar:\n');
    console.log(`Total records: ${data.length}\n`);
    
    const results11925 = data.filter(r => r.styleId === 11925);
    
    console.log(`Toplam ${results11925.length} satır bulundu\n`);
    
    // Range'lere göre grupla
    const byRange = {};
    results11925.forEach(r => {
      if (!byRange[r.range]) {
        byRange[r.range] = [];
      }
      byRange[r.range].push(r);
    });
    
    Object.keys(byRange).sort().forEach(range => {
      console.log(`\n📌 ${range}:`);
      console.log(`   Toplam: ${byRange[range].length} satır`);
      
      byRange[range].forEach(r => {
        console.log(`   - ${r.rangeTag} | ${r.rangeDetayi} | Plan: ${r.plan}, Gerç: ${r.gerceklesen} | Colorway: ${r.colorwayId} | Placeholder: ${r.placeholderId || 'null'}`);
      });
    });
    
    // Colorway bazında tekrar kontrolü
    console.log('\n\n🔍 Colorway bazında tekrar kontrolü:');
    const colorwayCount = {};
    results11925.forEach(r => {
      const key = `${r.colorwayId}_${r.extFldId}`;
      if (!colorwayCount[key]) {
        colorwayCount[key] = 0;
      }
      colorwayCount[key]++;
    });
    
    Object.keys(colorwayCount).forEach(key => {
      const [colorwayId, extFldId] = key.split('_');
      const sample = results11925.find(r => r.colorwayId == colorwayId && r.extFldId === extFldId);
      if (colorwayCount[key] > 1) {
        console.log(`   ⚠️  Colorway ${colorwayId} (${sample?.colorwayCode}) aynı range'de ${colorwayCount[key]} kez: ${sample?.range}`);
      }
    });

  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

test11925();
