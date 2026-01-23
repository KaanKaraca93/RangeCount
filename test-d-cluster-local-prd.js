const axios = require('axios');

async function testDClusterAPI() {
  try {
    console.log('🧪 Testing D-Cluster API (LOCAL → PRODUCTION)...\n');
    
    const url = 'http://localhost:3022/api/plm-d-cluster';
    
    console.log(`📡 GET ${url}\n`);
    
    const response = await axios.get(url);
    
    console.log('✅ Response Status:', response.status);
    console.log('\n📊 Response Data (ilk 3 kategori):\n');
    
    // İlk 3 kategoriyi göster
    const limitedData = {
      ...response.data,
      data: response.data.data.slice(0, 3)
    };
    
    console.log(JSON.stringify(limitedData, null, 2));
    console.log(`\n... ve ${response.data.data.length - 3} kategori daha\n`);
    
    // Toplam özet
    const toplam = response.data.data[0];
    console.log('📊 TOPLAM:');
    console.log(`   AGU: ${toplam.agu.gOpt}/${toplam.agu.plan} (${toplam.agu.oran})`);
    console.log(`   EYL: ${toplam.eyl.gOpt}/${toplam.eyl.plan} (${toplam.eyl.oran})`);
    console.log(`   EKM: ${toplam.ekm.gOpt}/${toplam.ekm.plan} (${toplam.ekm.oran})`);
    console.log(`   TOP: ${toplam.top.total}/${toplam.top.plan} (${toplam.top.oran})`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testDClusterAPI();
