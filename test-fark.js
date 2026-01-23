const axios = require('axios');

async function testFark() {
  try {
    const res = await axios.get('http://localhost:3023/api/plm-d-cluster');
    const t = res.data.data[0]; // Toplam
    
    console.log('\n📊 TOPLAM FARK DEĞERLERİ:\n');
    console.log(`   AGU fark: ${t.agu.fark} (${t.agu.total} - ${t.agu.plan})`);
    console.log(`   EYL fark: ${t.eyl.fark} (${t.eyl.total} - ${t.eyl.plan})`);
    console.log(`   EKM fark: ${t.ekm.fark} (${t.ekm.total} - ${t.ekm.plan})`);
    console.log(`   TOP fark: ${t.top.fark} (${t.top.total} - ${t.top.plan})\n`);
    console.log('✅ Pozitif = Fazla yapıldı, Negatif = Eksik kaldı\n');
    
  } catch (e) {
    console.error('❌', e.message);
  }
}

testFark();
