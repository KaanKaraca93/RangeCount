const XLSX = require('xlsx');
const path = require('path');

// Excel dosyasını oku
const workbook = XLSX.readFile(path.join(__dirname, '../RangeSayac.xlsx'));

// İlk sheet'i al
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// JSON'a çevir - tüm header'ları dahil et
const data = XLSX.utils.sheet_to_json(worksheet, { defval: null });

console.log('📊 Excel Verisi (İlk 3 satır):');
console.log('─'.repeat(120));
console.log(JSON.stringify(data.slice(0, 3), null, 2));
console.log('─'.repeat(120));
console.log(`\nToplam ${data.length} satır bulundu.`);

// Tüm alanları göster
if (data.length > 0) {
  console.log('\n📋 Tüm Alanlar:');
  Object.keys(data[0]).forEach(key => {
    const hasValues = data.some(row => row[key] !== null && row[key] !== undefined && row[key] !== '');
    console.log(`  - ${key} ${hasValues ? '✅' : '❌'}`);
  });
}
