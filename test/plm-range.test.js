const axios = require('axios');

const BASE_URL = 'http://localhost:3005/api';

async function testPlmRanges() {
  console.log('🧪 Testing PLM Real Range API...\n');

  try {
    // Test 1: Get all PLM ranges
    console.log('=== Test 1: GET /api/plm-ranges ===');
    const response1 = await axios.get(`${BASE_URL}/plm-ranges`);
    
    console.log('✅ Response:');
    console.log(`   Total rows: ${response1.data.count}`);
    console.log(`   First 3 rows:`);
    response1.data.data.slice(0, 3).forEach(row => {
      console.log(`     ${row.lifeStyleGrup} - ${row.urunAltGrup}: P=${row.pOpt}, T=${row.tOpt}, G=${row.gOpt}, Fark=${row.fark}, Oran=${row.oran}`);
    });
    
    console.log('\n=== Test 2: GET /api/plm-ranges/summary ===');
    const response2 = await axios.get(`${BASE_URL}/plm-ranges/summary`);
    
    console.log('✅ Genel Özet:');
    const genel = response2.data.summary.genel;
    console.log(`   Toplam Planlanan: ${genel.toplamPlanlanan}`);
    console.log(`   Toplam Gerçekleşen: ${genel.toplamGerceklesen}`);
    console.log(`   Toplam Taslak: ${genel.toplamTaslak}`);
    console.log(`   Toplam Fark: ${genel.toplamFark}`);
    console.log(`   Genel Tamamlanma: ${genel.genelTamamlanma}`);
    
    console.log('\n✅ Grup Bazında:');
    response2.data.summary.grupBazinda.forEach(grup => {
      console.log(`   ${grup.grup}: Planlanan=${grup.planlanan}, Gerçekleşen=${grup.gerceklesen}, Tamamlanma=${grup.tamamlanma}`);
    });

    console.log('\n✅ PLM Real Range API başarıyla çalışıyor!');
    
  } catch (error) {
    console.error('❌ Test hatası:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testPlmRanges();

