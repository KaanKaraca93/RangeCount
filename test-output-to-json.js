const axios = require('axios');
const fs = require('fs');

async function testAndSaveJSON() {
  try {
    console.log('🧪 Testing Range Count Source API...\n');
    
    const url = 'http://localhost:3028/api/range-count-source';
    
    console.log(`📡 GET ${url}\n`);
    
    const startTime = Date.now();
    const response = await axios.get(url);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✅ Response Status: ${response.status} (${duration}s)\n`);
    console.log(`📊 Toplam kayıt: ${response.data.count}`);
    console.log(`📊 Summary:`, JSON.stringify(response.data.summary, null, 2));
    
    // JSON dosyasına yaz
    const outputFile = 'range-count-source-output.json';
    fs.writeFileSync(outputFile, JSON.stringify(response.data, null, 2));
    
    console.log(`\n✅ Output kaydedildi: ${outputFile}`);
    console.log(`📋 İlk 3 kayıt:\n`);
    
    response.data.data.slice(0, 3).forEach((d, i) => {
      console.log(`${i + 1}. ${d.opsiyonKodu || 'PLANLANMAMIŞ'}: ${d.urunGrubu} - ${d.urunAltGrup}`);
      console.log(`   Plan: ${d.planOptionSay}, Gerçekleşen: ${d.gerceklesenOptionSay}`);
      console.log(`   Fashion Pyramid: ${d.fashionPyramid || 'null'}`);
      console.log(`   Life Style: ${d.lifeStyleGrup || 'null'}`);
      console.log(`   FT: ${d.ft || 'null'}`);
      console.log(`   Segment: ${d.segment || 'null'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testAndSaveJSON();
