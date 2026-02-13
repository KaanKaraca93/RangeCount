const XLSX = require('xlsx');

// Excel'den plan verilerini oku
const workbook = XLSX.readFile('Rangesayacv5.xlsx');
const worksheet = workbook.Sheets['Sayfa1'];
const planData = XLSX.utils.sheet_to_json(worksheet);

console.log('📊 Ipekyol ELBISE için tüm Range planları:\n');

const ipekyolElbise = planData.filter(p => 
  p.Marka === 'Ipekyol' && 
  p['Ürün Gurbu'] === 'ELBISE'
);

// RangeTag'lere göre grupla
const rangeGroups = {};
ipekyolElbise.forEach(p => {
  if (!rangeGroups[p.RangeTag]) {
    rangeGroups[p.RangeTag] = [];
  }
  rangeGroups[p.RangeTag].push(p);
});

Object.keys(rangeGroups).sort().forEach(rangeTag => {
  console.log(`\n🏷️  ${rangeTag}:`);
  
  // Aynı Range'i grupla
  const byRange = {};
  rangeGroups[rangeTag].forEach(p => {
    if (!byRange[p.Range]) {
      byRange[p.Range] = [];
    }
    byRange[p.Range].push(p);
  });
  
  Object.keys(byRange).forEach(range => {
    console.log(`   📌 ${range} (ExtFldId: ${byRange[range][0].ExtFldId})`);
    byRange[range].forEach(p => {
      console.log(`      - ${p['Range Detayı']} | DropDownValue: ${p.DropDownValue} | CUD5: ${p.CUD5Id} | Option Say: ${p['Option Say']}`);
    });
  });
});

console.log('\n\n🔍 ExtFldId ile RangeTag eşleşmesi:');
const extFldToRangeTag = {};
ipekyolElbise.forEach(p => {
  const key = `${p.ExtFldId}`;
  if (!extFldToRangeTag[key]) {
    extFldToRangeTag[key] = new Set();
  }
  extFldToRangeTag[key].add(p.RangeTag);
});

Object.keys(extFldToRangeTag).forEach(extFldId => {
  const rangeTags = Array.from(extFldToRangeTag[extFldId]);
  console.log(`   ${extFldId.substring(0, 8)}... → ${rangeTags.join(', ')}`);
  
  // İlgili Range'i bul
  const samplePlan = ipekyolElbise.find(p => p.ExtFldId === extFldId);
  if (samplePlan) {
    console.log(`      (${samplePlan.Range})`);
  }
});

console.log('\n\n⚠️  SORUNLU: Aynı ExtFldId birden fazla RangeTag\'de mi?');
Object.keys(extFldToRangeTag).forEach(extFldId => {
  const rangeTags = Array.from(extFldToRangeTag[extFldId]);
  if (rangeTags.length > 1) {
    const samplePlan = ipekyolElbise.find(p => p.ExtFldId === extFldId);
    console.log(`   ❌ ${samplePlan?.Range || 'Unknown'} (${extFldId.substring(0, 8)}...) → ${rangeTags.join(', ')}`);
  }
});
