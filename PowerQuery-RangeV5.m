let
    // API URL'ini tanımla
    apiUrl = "https://rangecount-652fcc1f20d9.herokuapp.com/api/range-v5",
    
    // API'den veri çek
    source = Json.Document(Web.Contents(apiUrl)),
    
    // Data array'ini tabloya çevir
    dataList = source[data],
    dataTable = Table.FromList(dataList, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    
    // Record'ları genişlet
    expandedData = Table.ExpandRecordColumn(dataTable, "Column1", 
        {"marka", "brandId", "urunGrubu", "subSubCategoryId", "rangeTag", "range", 
         "extFldId", "rangeDetayi", "dropDownValue", "cud5Id", "pOpt", "gOpt", "fark", "oran"}, 
        {"Marka", "BrandId", "UrunGrubu", "SubSubCategoryId", "RangeTag", "Range", 
         "ExtFldId", "RangeDetayi", "DropDownValue", "CUD5Id", "P_Opt", "G_Opt", "Fark", "Oran"}),
    
    // Veri tiplerini ayarla
    typedData = Table.TransformColumnTypes(expandedData, {
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
        {"P_Opt", Int64.Type},
        {"G_Opt", Int64.Type},
        {"Fark", Int64.Type},
        {"Oran", type text}
    }),
    
    // Oran sütununu yüzde formatına çevir (% işaretini kaldır ve sayıya çevir)
    addOranNumeric = Table.AddColumn(typedData, "OranNumeric", each 
        Number.From(Text.BeforeDelimiter([Oran], "%")) / 100, Percentage.Type),
    
    // Tamamlanma durumu sütunu ekle
    addStatus = Table.AddColumn(addOranNumeric, "Durum", each 
        if [P_Opt] = 0 then "Plan Yok, Gerçekleşen Var"
        else if [G_Opt] = 0 then "Henüz Başlanmadı"
        else if [OranNumeric] >= 1 then "Tamamlandı"
        else if [OranNumeric] >= 0.5 then "Yarı Yolda"
        else "Başlangıç Aşaması", type text),
    
    // FT durumu sütunu ekle
    addFTStatus = Table.AddColumn(addStatus, "FT_Durumu", each 
        if [CUD5Id] = 1 then "Standart"
        else if [CUD5Id] = 2 then "FT"
        else "Diğer", type text)
in
    addFTStatus


/* 
KULLANIM TALİMATI:
==================

1. Excel'de "Veri" (Data) sekmesine gidin
2. "Veri Al" (Get Data) > "Diğer Kaynaklardan" (From Other Sources) > "Boş Sorgu" (Blank Query)
3. "Gelişmiş Düzenleyici"yi (Advanced Editor) açın
4. Yukarıdaki kodu yapıştırın
5. "Bitti" (Done) ve "Kapat ve Yükle" (Close & Load)

NOTLAR:
- API canlı ortamdan (Heroku) veri çeker
- Yenileme butonu ile güncel verileri alabilirsiniz
- Pivot tablo oluşturarak detaylı analiz yapabilirsiniz

ÖNERİLEN PİVOT TABLO YAPISI:
============================
Satırlar: Marka, UrunGrubu, Range, RangeDetayi
Sütunlar: FT_Durumu, Durum
Değerler: Sum(P_Opt), Sum(G_Opt), Sum(Fark), Average(OranNumeric)

*/
