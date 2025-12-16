const XLSX = require('xlsx');
const path = require('path');

// Detay verilerini işle ve eksik kolonları ekle
const baseData = [
  { "Life Style Grup": "Business", "Ürün Alt Grup": "ELBISE", "Kumaş Tipi": "Dokuma", "Açıklama": "", "P_Opt": 9 },
  { "Life Style Grup": "Business", "Ürün Alt Grup": "ELBISE", "Kumaş Tipi": "Triko", "Açıklama": "", "P_Opt": 1 },
  { "Life Style Grup": "Business", "Ürün Alt Grup": "ELBISE", "Kumaş Tipi": "Kumaş Mix", "Açıklama": "", "P_Opt": 1 },
  { "Life Style Grup": "Essential", "Ürün Alt Grup": "ELBISE", "Kumaş Tipi": "Dokuma", "Açıklama": "", "P_Opt": 2 },
  { "Life Style Grup": "Essential", "Ürün Alt Grup": "ELBISE", "Kumaş Tipi": "Kumaş Mix", "Açıklama": "", "P_Opt": 2 },
  { "Life Style Grup": "Mono", "Ürün Alt Grup": "ELBISE", "Kumaş Tipi": "Dokuma", "Açıklama": "", "P_Opt": 42 },
  { "Life Style Grup": "Mono", "Ürün Alt Grup": "ELBISE", "Kumaş Tipi": "Örme", "Açıklama": "", "P_Opt": 6 },
  { "Life Style Grup": "Mono", "Ürün Alt Grup": "ELBISE", "Kumaş Tipi": "Triko", "Açıklama": "", "P_Opt": 1 },
  { "Life Style Grup": "Mono", "Ürün Alt Grup": "ELBISE", "Kumaş Tipi": "Kumaş Mix", "Açıklama": "", "P_Opt": 8 },
  { "Life Style Grup": "Tema", "Ürün Alt Grup": "ELBISE", "Kumaş Tipi": "Dokuma", "Açıklama": "", "P_Opt": 22 },
  { "Life Style Grup": "Tema", "Ürün Alt Grup": "ELBISE", "Kumaş Tipi": "Örme", "Açıklama": "", "P_Opt": 10 },
  { "Life Style Grup": "Tema", "Ürün Alt Grup": "ELBISE", "Kumaş Tipi": "Triko", "Açıklama": "", "P_Opt": 5 },
  { "Life Style Grup": "Tema", "Ürün Alt Grup": "ELBISE", "Kumaş Tipi": "Kumaş Mix", "Açıklama": "", "P_Opt": 4 }
];

// Her satır için eksik alanları doldur
const detailData = baseData.map(row => {
  const P_Opt = row.P_Opt;
  
  // G_Opt: %60-100 arası tamamlanma
  const completionRate = 0.6 + Math.random() * 0.4;
  let G_Opt = Math.floor(P_Opt * completionRate);
  if (G_Opt > P_Opt) G_Opt = P_Opt;
  
  // T_Opt: Taslak (0-5 arası)
  const T_Opt = Math.floor(Math.random() * 6);
  
  // Fark = P_Opt - G_Opt
  const Fark = P_Opt - G_Opt;
  
  // Oran = (G_Opt / P_Opt) * 100%
  const Oran = P_Opt > 0 ? Math.round((G_Opt / P_Opt) * 100) : 0;
  
  return {
    "Life Style Grup": row["Life Style Grup"],
    "Ürün Alt Grup": row["Ürün Alt Grup"],
    "Kumaş Tipi": row["Kumaş Tipi"],
    "Açıklama": row.Açıklama,
    "P_Opt": P_Opt,
    "T_Opt": T_Opt,
    "G_Opt": G_Opt,
    "Fark": Fark,
    "Oran": `${Oran}%`
  };
});

// Worksheet oluştur
const worksheet = XLSX.utils.json_to_sheet(detailData);

// Workbook oluştur
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'RangeDetay');

// Dosyayı kaydet
const outputPath = path.join(__dirname, '../RangeDetay.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log('✅ RangeDetay.xlsx oluşturuldu!');
console.log('📊 Toplam', detailData.length, 'satır');

