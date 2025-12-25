const axios = require('axios');

const BASE_URL = 'http://localhost:3006/api';

async function testPlmThemes() {
  console.log('🧪 Testing PLM Theme API...\n');

  try {
    // Test 1: Get all PLM themes
    console.log('=== Test 1: GET /api/plm-themes ===');
    const response1 = await axios.get(`${BASE_URL}/plm-themes`);
    
    console.log('✅ Response:');
    console.log(`   Total themes: ${response1.data.count}`);
    console.log(`   All themes:`);
    response1.data.data.forEach(row => {
      console.log(`     ${row.temaAdi} (ID: ${row.temaId}): P=${row.pOpt}, T=${row.tOpt}, G=${row.gOpt}, Fark=${row.fark}, Oran=${row.oran}`);
    });
    
    console.log('\n=== Test 2: GET /api/plm-themes/summary ===');
    const response2 = await axios.get(`${BASE_URL}/plm-themes/summary`);
    
    console.log('✅ Genel Özet:');
    const summary = response2.data.summary;
    console.log(`   Tema Sayısı: ${summary.temaSayisi}`);
    console.log(`   Toplam Planlanan: ${summary.toplamPlanlanan}`);
    console.log(`   Toplam Gerçekleşen: ${summary.toplamGerceklesen}`);
    console.log(`   Toplam Taslak: ${summary.toplamTaslak}`);
    console.log(`   Toplam Fark: ${summary.toplamFark}`);
    console.log(`   Genel Tamamlanma: ${summary.genelTamamlanma}`);

    console.log('\n✅ PLM Theme API başarıyla çalışıyor!');
    
  } catch (error) {
    console.error('❌ Test hatası:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testPlmThemes();

