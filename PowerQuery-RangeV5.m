let
    // API URL'ini tanımla
    apiUrl = "https://rangecount-652fcc1f20d9.herokuapp.com/api/range-v5",
    
    // API'den veri çek
    source = Json.Document(Web.Contents(apiUrl)),
    
    // Data array'ini tabloya çevir
    dataList = source[data],
    dataTable = Table.FromList(dataList, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    
    // Record'ları genişlet (Unpivot format)
    expandedData = Table.ExpandRecordColumn(dataTable, "Column1", 
        {"placeholderId", "marka", "brandId", "urunGrubu", "subSubCategoryId", "rangeTag", 
         "range", "extFldId", "rangeDetayi", "dropDownValue", "cud5Id", "plan", "gerceklesen",
         "styleId", "styleCode", "colorwayId", "colorwayCode", "colorwayName"}, 
        {"PlaceholderId", "Marka", "BrandId", "UrunGrubu", "SubSubCategoryId", "RangeTag", 
         "Range", "ExtFldId", "RangeDetayi", "DropDownValue", "CUD5Id", "Plan", "Gerceklesen",
         "StyleId", "StyleCode", "ColorwayId", "ColorwayCode", "ColorwayName"}),
    
    // Veri tiplerini ayarla
    typedData = Table.TransformColumnTypes(expandedData, {
        {"PlaceholderId", type text},
        {"Marka", type text},
        {"BrandId", Int64.Type},
        {"UrunGrubu", type text},
        {"SubSubCategoryId", Int64.Type},
        {"RangeTag", type text},
        {"Range", type text},
        {"ExtFldId", type text},
        {"RangeDetayi", type text},
        {"DropDownValue", Int64.Type},
        {"CUD5Id", Int64.Type},
        {"Plan", Int64.Type},
        {"Gerceklesen", Int64.Type},
        {"StyleId", Int64.Type},
        {"StyleCode", type text},
        {"ColorwayId", Int64.Type},
        {"ColorwayCode", type text},
        {"ColorwayName", type text}
    }),
    
    // Eşleşme durumu sütunu ekle
    addMatchStatus = Table.AddColumn(typedData, "EslesmeDurumu", each 
        if [Plan] = 1 and [Gerceklesen] = 1 then "Eşleşen"
        else if [Plan] = 1 and [Gerceklesen] = 0 then "Eşleşmeyen"
        else if [Plan] = 0 and [Gerceklesen] = 1 then "Plan Dışı Gerçekleşen"
        else "Diğer", type text),
    
    // FT durumu sütunu ekle
    addFTStatus = Table.AddColumn(addMatchStatus, "FT_Durumu", each 
        if [CUD5Id] = 1 then "Standart"
        else if [CUD5Id] = 2 then "FT"
        else "Diğer", type text),
    
    // Placeholder tipi (gerçek plan mı, otomatik oluşturulmuş mu)
    addPlaceholderType = Table.AddColumn(addFTStatus, "PlaceholderTipi", each 
        if [Plan] = 1 then "Planlanan"
        else "Otomatik Oluşturulmuş", type text)
in
    addPlaceholderType


/* 
KULLANIM TALİMATI:
==================

1. Excel'de "Veri" (Data) sekmesine gidin
2. "Veri Al" (Get Data) > "Diğer Kaynaklardan" (From Other Sources) > "Boş Sorgu" (Blank Query)
3. "Gelişmiş Düzenleyici"yi (Advanced Editor) açın
4. Yukarıdaki kodu yapıştırın
5. "Bitti" (Done) ve "Kapat ve Yükle" (Close & Load)

VERİ FORMATI (UNPIVOT - HAM VERİ):
===================================
Bu API unpivot (ham) veri döner. Her satır bir placeholder-colorway eşleşmesini gösterir.

ÖNEMLİ SÜTUNLAR:
- PlaceholderId: PH1, PH2, PH3... (Her placeholder'ın unique kodu)
- Plan: 1 (planlanan) veya 0 (plan dışı)
- Gerceklesen: 1 (eşleşen) veya 0 (eşleşmeyen)
- EslesmeDurumu: "Eşleşen", "Eşleşmeyen", "Plan Dışı Gerçekleşen"
- StyleId, ColorwayId: Eşleşen ürün bilgileri (null ise eşleşme yok)

SENARYO ÖRNEKLERİ:
==================
1. Plan=1, Gerceklesen=1, StyleId dolu → Planlanan ve gerçekleşen (eşleşen)
2. Plan=1, Gerceklesen=0, StyleId null → Planlanan ama gerçekleşmeyen
3. Plan=0, Gerceklesen=1, StyleId dolu → Plan dışı gerçekleşen

ÖNERİLEN ANALİZ:
===============
1. Pivot Tablo:
   Satırlar: Marka, UrunGrubu, Range, RangeDetayi
   Sütunlar: EslesmeDurumu
   Değerler: Count(PlaceholderId), CountDistinct(StyleId)

2. Eşleşme Analizi:
   - Hangi placeholder'lara hangi style/colorway'ler eşleşmiş?
   - Filtre: EslesmeDurumu = "Eşleşen", StyleCode, ColorwayName görüntüle

3. Eksik Plan Analizi:
   - Filtre: EslesmeDurumu = "Eşleşmeyen"
   - Hangi range'lerde gerçekleşme eksik?

*/
