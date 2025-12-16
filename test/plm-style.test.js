/**
 * PLM Style & Past Season Data Test
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3006/api';

async function testPLMStyle() {
  console.log('🧪 Testing PLM Style & Past Season Data API...\n');
  
  try {
    // Test 1: Past Season Data
    console.log('Test 1: Post Past Season Data (StyleId=158)');
    console.log('─'.repeat(80));
    
    const pastSeasonResponse = await axios.post(`${BASE_URL}/past-season-data`, {
      StyleId: 158
    });
    
    console.log('✅ Response:');
    console.log(JSON.stringify(pastSeasonResponse.data, null, 2));
    console.log();
    
    // UDF7 durumunu kontrol et
    if (pastSeasonResponse.data.hasData) {
      console.log('📊 UDF7 DOLU - Geçen sezon verisi oluşturuldu');
      console.log(`   Previous Season Code: ${pastSeasonResponse.data.previousSeasonStyleCode}`);
      console.log(`   Sellout: ${pastSeasonResponse.data.data.sellout}`);
      console.log(`   Markdown: ${pastSeasonResponse.data.data.markdown}%`);
      console.log(`   ROS: ${pastSeasonResponse.data.data.ros}%`);
      console.log(`   FOB Cost (USD): $${pastSeasonResponse.data.data.fobCostUSD}`);
    } else {
      console.log('⚠️  UDF7 BOŞ - Tüm değerler 0');
    }
    console.log();
    
    // Test 2: PLM Style Info (test endpoint)
    console.log('Test 2: Get PLM Style Info (StyleId=158)');
    console.log('─'.repeat(80));
    
    const styleResponse = await axios.get(`${BASE_URL}/plm-style/158`);
    
    console.log('✅ PLM Style Data:');
    console.log(JSON.stringify(styleResponse.data, null, 2));
    console.log();
    
    console.log('✅ All PLM Style tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run tests
testPLMStyle();

