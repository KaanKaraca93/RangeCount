const axios = require('axios');

const BASE_URL = 'http://localhost:3011/api';

async function testBanner() {
  console.log('🧪 Testing Banner API...\n');

  try {
    console.log('=== GET /api/banner ===');
    const response = await axios.get(`${BASE_URL}/banner`);
    
    console.log('✅ Banner Response:\n');
    
    const { urunKategorisi, tema } = response.data.data;
    
    console.log('📦 Ürün Kategorisi:');
    console.log(`   Toplam P_Opt: ${urunKategorisi.toplamPOpt}`);
    console.log(`   Toplam G_Opt: ${urunKategorisi.toplamGOpt}`);
    console.log(`   Fark (P - G): ${urunKategorisi.fark}`);
    console.log(`   Tamamlanma Oranı: ${urunKategorisi.tamamlanmaOrani}`);
    
    console.log('\n🎨 Tema:');
    console.log(`   Toplam P_Opt: ${tema.toplamPOpt}`);
    console.log(`   Toplam G_Opt: ${tema.toplamGOpt}`);
    console.log(`   Fark (P - G): ${tema.fark}`);
    console.log(`   Tamamlanma Oranı: ${tema.tamamlanmaOrani}`);

    console.log('\n✅ Banner API başarıyla çalışıyor!');
    console.log('\n📋 Example JSON Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Test hatası:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testBanner();

