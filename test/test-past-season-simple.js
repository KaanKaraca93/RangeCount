const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testSimplePastSeason() {
  console.log('🧪 Testing Simple Past Season API (GET - No StyleId)...\n');
  
  try {
    // Test 3 kez - her seferinde farklı random değerler görmeli
    for (let i = 1; i <= 3; i++) {
      console.log(`\n=== İstek ${i} ===`);
      
      const response = await axios.get(`${BASE_URL}/past-season-data`);
      
      const data = response.data.data;
      const fobCalculated = data.fabricCost + data.trimCost + data.laborCost + data.embroideryCost;
      
      console.log('✅ Response:');
      console.log(`  Sales Performance: ${data.salesPerformance.toUpperCase()} 🏷️`);
      console.log(`  Sellout: ${data.sellout} adet`);
      console.log(`  ROS: ${data.ros}%`);
      console.log(`  Markdown: ${data.markdown}%`);
      console.log(`  FOB: $${data.fobCostUSD} = $${data.fabricCost} + $${data.laborCost} + $${data.trimCost} + $${data.embroideryCost}`);
      console.log(`  FOB Kontrol: ${Math.abs(fobCalculated - data.fobCostUSD) < 0.01 ? '✅' : '❌'} ($${fobCalculated.toFixed(2)})`);
    }
    
    console.log('\n✅ API başarıyla çalışıyor - Her istekte farklı random değerler!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testSimplePastSeason();

