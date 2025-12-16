const axios = require('axios');

const BASE_URL = 'http://localhost:3008/api';

async function testStyle41() {
  try {
    console.log('🧪 Testing StyleId 41...\n');
    
    const response = await axios.post(`${BASE_URL}/past-season-data`, {
      StyleId: 41
    });
    
    console.log('✅ Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.hasData) {
      console.log('\n📊 UDF7 DOLU - Random veriler:');
      console.log(`   Previous Season Code: ${response.data.previousSeasonStyleCode}`);
      console.log(`   Sellout: ${response.data.data.sellout}`);
      console.log(`   Markdown: ${response.data.data.markdown}%`);
      console.log(`   ROS: ${response.data.data.ros}%`);
      console.log(`   FOB Cost: $${response.data.data.fobCostUSD}`);
      console.log(`   Fabric Cost: $${response.data.data.fabricCost}`);
      console.log(`   Trim Cost: $${response.data.data.trimCost}`);
      console.log(`   Labor Cost: $${response.data.data.laborCost}`);
      console.log(`   Embroidery Cost: $${response.data.data.embroideryCost}`);
    } else {
      console.log('\n⚠️  UDF7 BOŞ - Tüm değerler 0');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testStyle41();

