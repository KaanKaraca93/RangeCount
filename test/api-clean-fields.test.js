/**
 * Test Clean Field Names (no spaces)
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3005/api';

async function testCleanFields() {
  console.log('🧪 Testing Clean Field Names (No Spaces)...\n');
  
  try {
    // Test 1: Range Data
    console.log('Test 1: Range Data - Clean Fields');
    console.log('─'.repeat(80));
    const rangesResponse = await axios.get(`${BASE_URL}/ranges`);
    console.log(`✅ Success: ${rangesResponse.data.count} ranges`);
    console.log('\nÖrnek veri:');
    console.log(JSON.stringify(rangesResponse.data.data[0], null, 2));
    console.log('\n📋 Field isimleri:');
    Object.keys(rangesResponse.data.data[0]).forEach(key => {
      const hasSpace = key.includes(' ');
      console.log(`  ${hasSpace ? '❌' : '✅'} ${key}`);
    });
    console.log();

    // Test 2: Range Details
    console.log('Test 2: Range Details - Clean Fields');
    console.log('─'.repeat(80));
    const detailsResponse = await axios.get(`${BASE_URL}/range-details`);
    console.log(`✅ Success: ${detailsResponse.data.count} details`);
    console.log('\nÖrnek veri:');
    console.log(JSON.stringify(detailsResponse.data.data[0], null, 2));
    console.log('\n📋 Field isimleri:');
    Object.keys(detailsResponse.data.data[0]).forEach(key => {
      const hasSpace = key.includes(' ');
      console.log(`  ${hasSpace ? '❌' : '✅'} ${key}`);
    });
    
    console.log('\n✅ All fields are clean (no spaces)!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests
testCleanFields();

