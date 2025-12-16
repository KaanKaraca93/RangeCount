/**
 * Range API Test
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testRangeAPI() {
  console.log('🧪 Testing Range API...\n');
  
  try {
    // Test 1: Get All Ranges
    console.log('Test 1: Get All Ranges');
    console.log('─'.repeat(80));
    const rangesResponse = await axios.get(`${BASE_URL}/ranges`);
    console.log(`✅ Success: ${rangesResponse.data.count} ranges found`);
    console.log('İlk 2 satır:');
    console.log(JSON.stringify(rangesResponse.data.data.slice(0, 2), null, 2));
    console.log();

    // Test 2: Get Summary
    console.log('Test 2: Get Summary Statistics');
    console.log('─'.repeat(80));
    const summaryResponse = await axios.get(`${BASE_URL}/ranges/summary`);
    console.log('✅ Summary:');
    console.log(JSON.stringify(summaryResponse.data.summary, null, 2));
    console.log();

    // Test 3: Get by Lifestyle Group
    console.log('Test 3: Get by Lifestyle Group (Mono)');
    console.log('─'.repeat(80));
    const monoResponse = await axios.get(`${BASE_URL}/ranges/lifestyle/Mono`);
    console.log(`✅ Success: ${monoResponse.data.count} items in Mono group`);
    console.log();

    // Test 4: Get by Product Group
    console.log('Test 4: Get by Product Group (ELBISE)');
    console.log('─'.repeat(80));
    const elbiseResponse = await axios.get(`${BASE_URL}/ranges/product/ELBISE`);
    console.log(`✅ Success: ${elbiseResponse.data.count} ELBISE items`);
    console.log(JSON.stringify(elbiseResponse.data.data, null, 2));
    console.log();

    console.log('✅ All API tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run tests
testRangeAPI();

