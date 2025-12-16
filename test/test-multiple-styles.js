const axios = require('axios');

const BASE_URL = 'http://localhost:3008/api';

async function testMultipleStyles() {
  console.log('🧪 Testing Multiple Styles for Realistic Data...\n');
  
  const styleIds = [41, 42, 43, 44, 45];
  
  for (const styleId of styleIds) {
    try {
      const response = await axios.post(`${BASE_URL}/past-season-data`, {
        StyleId: styleId
      });
      
      if (response.data.hasData) {
        const data = response.data.data;
        const fobCalculated = data.fabricCost + data.trimCost + data.laborCost + data.embroideryCost;
        
        console.log(`StyleId ${styleId} (UDF7: ${response.data.previousSeasonStyleCode}):`);
        console.log(`  ROS: ${data.ros}% | Markdown: ${data.markdown}% | Sellout: ${data.sellout}`);
        console.log(`  FOB: $${data.fobCostUSD} = Fabric($${data.fabricCost}) + Labor($${data.laborCost}) + Trim($${data.trimCost}) + Embr($${data.embroideryCost})`);
        console.log(`  Toplam Kontrol: $${fobCalculated.toFixed(2)} ${Math.abs(fobCalculated - data.fobCostUSD) < 0.01 ? '✅' : '❌'}`);
        
        // ROS-Markdown ilişkisi kontrolü
        if (data.ros >= 85 && data.markdown <= 20) {
          console.log(`  Mantık: ✅ Yüksek ROS + Düşük Markdown (iyi satan ürün)`);
        } else if (data.ros >= 75 && data.markdown <= 30) {
          console.log(`  Mantık: ✅ İyi ROS + Orta Markdown`);
        } else if (data.ros < 75 && data.markdown >= 25) {
          console.log(`  Mantık: ✅ Düşük ROS + Yüksek Markdown (zor satan)`);
        } else {
          console.log(`  Mantık: ⚠️  ROS ve Markdown ilişkisi beklenmedik`);
        }
        
        console.log();
      } else {
        console.log(`StyleId ${styleId}: UDF7 boş - Tüm değerler 0\n`);
      }
      
    } catch (error) {
      console.error(`StyleId ${styleId}: ❌ ${error.message}\n`);
    }
  }
}

testMultipleStyles();

