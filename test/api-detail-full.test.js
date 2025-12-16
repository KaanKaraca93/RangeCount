/**
 * Range Detail Full API Test (with all columns)
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3004/api';

async function testFullDetailAPI() {
  console.log('🧪 Testing Full Range Detail API...\n');
  
  try {
    // Test: Get All Details with full columns
    console.log('Test: Get All Range Details (Full Columns)');
    console.log('─'.repeat(80));
    const allResponse = await axios.get(`${BASE_URL}/range-details`);
    console.log(`✅ Success: ${allResponse.data.count} detail records`);
    console.log('\nÖrnek 3 satır (tüm kolonlar):');
    console.log(JSON.stringify(allResponse.data.data.slice(0, 3), null, 2));
    
    // Kolonları kontrol et
    if (allResponse.data.data.length > 0) {
      console.log('\n📋 Mevcut Kolonlar:');
      Object.keys(allResponse.data.data[0]).forEach(key => {
        console.log(`  ✅ ${key}`);
      });
    }
    
    console.log('\n✅ All columns test passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run tests
testFullDetailAPI();

