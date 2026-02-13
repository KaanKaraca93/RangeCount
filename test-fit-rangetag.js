const axios = require('axios');

async function testFitRangeTag() {
  try {
    console.log('🔍 Range V5 API\'den IW6260002151 için sonuçları kontrol ediyoruz...\n');

    const response = await axios.get('http://localhost:3037/api/range-v5');
    console.log('Response type:', typeof response.data);
    console.log('Response keys:', Object.keys(response.data).slice(0, 5));
    
    const allResults = Array.isArray(response.data) ? response.data : response.data.data || [];

    console.log(`📊 Toplam ${allResults.length} satır döndü\n`);

    // IW6260002151 içeren kayıtları bul
    const targetResults = allResults.filter(r => r.styleCode === 'IW6260002151');

    if (targetResults.length === 0) {
      console.log('❌ IW6260002151 bulunamadı!\n');
      
      // Ipekyol ELBISE + Fit içeren kayıtlardan örnek göster
      console.log('📋 Ipekyol ELBISE + Fit için örnek kayıtlar:\n');
      const ipekyolElbiseFit = allResults.filter(r => 
        r.marka === 'Ipekyol' && 
        r.urunGrubu === 'ELBISE' && 
        r.range === 'Fit'
      ).slice(0, 10);

      ipekyolElbiseFit.forEach(r => {
        console.log(`${r.styleCode || 'N/A'} | ${r.rangeTag} | ${r.rangeDetayi} | Plan: ${r.plan}, Gerç: ${r.gerceklesen}`);
      });

    } else {
      console.log(`✅ ${targetResults.length} kayıt bulundu:\n`);
      
      // Fit içeren kayıtları göster
      const fitRecords = targetResults.filter(r => r.range === 'Fit');
      
      if (fitRecords.length > 0) {
        console.log('🎯 FIT kayıtları:');
        fitRecords.forEach(r => {
          console.log(`  RangeTag: ${r.rangeTag} | ${r.rangeDetayi} | DropDownValue: ${r.dropDownValue} | Plan: ${r.plan}, Gerç: ${r.gerceklesen}`);
        });
      }

      console.log('\n📋 Tüm range kayıtları (RangeTag kontrolü):');
      const grouped = {};
      targetResults.forEach(r => {
        const key = r.range;
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(r);
      });

      Object.keys(grouped).sort().forEach(range => {
        console.log(`\n  ${range}:`);
        const uniqueRangeTags = [...new Set(grouped[range].map(r => r.rangeTag))];
        console.log(`    RangeTag(s): ${uniqueRangeTags.join(', ')}`);
        console.log(`    Kayıt sayısı: ${grouped[range].length}`);
        
        grouped[range].slice(0, 3).forEach(r => {
          console.log(`      - ${r.rangeDetayi} | ${r.rangeTag} | DropDownValue: ${r.dropDownValue}`);
        });
      });
    }

    // Genel RangeTag dağılımı
    console.log('\n\n📊 Ipekyol ELBISE için RangeTag dağılımı:');
    const ipekyolElbise = allResults.filter(r => 
      r.marka === 'Ipekyol' && 
      r.urunGrubu === 'ELBISE'
    );

    const rangeToRangeTag = {};
    ipekyolElbise.forEach(r => {
      const key = r.range;
      if (!rangeToRangeTag[key]) {
        rangeToRangeTag[key] = new Set();
      }
      rangeToRangeTag[key].add(r.rangeTag);
    });

    Object.keys(rangeToRangeTag).sort().forEach(range => {
      const tags = Array.from(rangeToRangeTag[range]);
      console.log(`  ${range}: ${tags.join(', ')}`);
      
      if (tags.length > 1) {
        console.log(`    ⚠️  UYARI: Birden fazla RangeTag!`);
      }
    });

  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

testFitRangeTag();
