const XLSX = require('xlsx');
const path = require('path');

// Excel dosyasını oku
const workbook = XLSX.readFile(path.join(__dirname, '../RangeSayacv3.xlsx'));
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('📊 RangeSayacv3.xlsx (Tema Hedefleri):');
console.log('─'.repeat(120));
console.log(JSON.stringify(data.slice(0, 5), null, 2));
console.log('─'.repeat(120));
console.log(`\nToplam ${data.length} satır`);

// Alanları kontrol et
if (data.length > 0) {
  console.log('\n📋 Kolonlar:');
  Object.keys(data[0]).forEach(key => {
    console.log(`  ✅ ${key}`);
  });
}

