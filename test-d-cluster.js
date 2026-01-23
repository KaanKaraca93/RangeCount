const axios = require('axios');

async function testDClusterAPI() {
  try {
    console.log('🧪 Testing D-Cluster API...\n');
    
    const url = 'https://rangecount-652fcc1f20d9.herokuapp.com/api/plm-d-cluster';
    
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
