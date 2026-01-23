const axios = require('axios');

async function testDClusterAPI() {
  try {
    console.log('🧪 Testing D-Cluster API (LOCAL)...\n');
    
    const url = 'http://localhost:3021/api/plm-d-cluster';
    
    console.log(`📡 GET ${url}\n`);
    
    const response = await axios.get(url);
    
    console.log('✅ Response Status:', response.status);
    console.log('\n📊 Response Data:\n');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testDClusterAPI();
