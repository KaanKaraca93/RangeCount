const axios = require('axios');

async function testRangeCountSource() {
  try {
    console.log('🧪 Testing Range Count Source API...\n');
    
    const url = 'http://localhost:3025/api/range-count-source';
    
    console.log(`📡 GET ${url}\n`);
    
    const startTime = Date.now();
    const response = await axios.get(url);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✅ Response Status: ${response.status} (${duration}s)\n`);
    
    // Özet
    console.log('📊 SUMMARY:');
    console.log(JSON.stringify(response.data.summary, null, 2));
    
    // İlk 3 kayıt
    console.log('\n📋 İlk 3 Kayıt (Placeholder var):');
    const withPlaceholder = response.data.data.filter(d => d.opsiyonKodu !== null).slice(0, 3);
    withPlaceholder.forEach(d => {
      console.log(`\n${d.opsiyonKodu}: ${d.urunGrubu} - ${d.urunAltGrup}`);
      console.log(`  Plan: ${d.planOptionSay}, Gerçekleşen: ${d.gerceklesenOptionSay}`);
      console.log(`  Ürün: ${d.gerceklesenUrunKodu || 'YOK'}`);
    });
    
    // Planlanmayan
    console.log('\n📋 İlk 3 Kayıt (Placeholder YOK - Plan=0):');
    const withoutPlaceholder = response.data.data.filter(d => d.opsiyonKodu === null).slice(0, 3);
    withoutPlaceholder.forEach(d => {
      console.log(`\nPlanlanmamış: ${d.urunGrubu} - ${d.urunAltGrup}`);
      console.log(`  Fashion Pyramid: ${d.fashionPyramid}, Life Style: ${d.lifeStyleGrup}`);
      console.log(`  Plan: ${d.planOptionSay}, Gerçekleşen: ${d.gerceklesenOptionSay}`);
      console.log(`  Ürün: ${d.gerceklesenUrunKodu}`);
    });
    
    console.log(`\n✅ Toplam ${response.data.count} kayıt\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testRangeCountSource();
