const XLSX = require('xlsx');

try {
  const wb = XLSX.readFile('RangeSayacv4.xlsx');
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws);
  
  console.log('📊 İlk 3 satır:\n');
  console.log(JSON.stringify(data.slice(0, 3), null, 2));
  
  console.log('\n📋 Toplam satır:', data.length);
  console.log('🔑 Başlıklar:', Object.keys(data[0]).join(', '));
  
} catch (error) {
  console.error('❌ Hata:', error.message);
}
