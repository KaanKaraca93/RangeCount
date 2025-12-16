/**
 * Range Detail API Test
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3003/api';

async function testRangeDetailAPI() {
  console.log('🧪 Testing Range Detail API...\n');
  
  try {
    // Test 1: Get All Details
    console.log('Test 1: Get All Range Details');
    console.log('─'.repeat(80));
    const allResponse = await axios.get(`${BASE_URL}/range-details`);
    console.log(`✅ Success: ${allResponse.data.count} detail records`);
    console.log('İlk 3 satır:');
    console.log(JSON.stringify(allResponse.data.data.slice(0, 3), null, 2));
    console.log();

    // Test 2: Get Mono ELBISE Detail
    console.log('Test 2: Get Mono - ELBISE Detail');
    console.log('─'.repeat(80));
    const monoElbiseResponse = await axios.get(`${BASE_URL}/range-details/detail/Mono/ELBISE`);
    console.log(`✅ Success: ${monoElbiseResponse.data.count} items`);
    console.log(JSON.stringify(monoElbiseResponse.data.data, null, 2));
    console.log();

    // Test 3: Get by Fabric Type
    console.log('Test 3: Get by Fabric Type (Dokuma)');
    console.log('─'.repeat(80));
    const dokumaResponse = await axios.get(`${BASE_URL}/range-details/fabric/Dokuma`);
    console.log(`✅ Success: ${dokumaResponse.data.count} dokuma items`);
    console.log();

    // Test 4: Fabric Summary
    console.log('Test 4: Fabric Summary');
    console.log('─'.repeat(80));
    const summaryResponse = await axios.get(`${BASE_URL}/range-details/summary/fabric`);
    console.log('✅ Kumaş Tipi Özeti:');
    console.log(JSON.stringify(summaryResponse.data.summary, null, 2));
    console.log();

    console.log('✅ All Range Detail API tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run tests
testRangeDetailAPI();

