let
    // API URL
    ApiUrl = "https://rangecount-652fcc1f20d9.herokuapp.com/api/range-count-source",
    
    // API'den veri çek
    Source = Json.Document(Web.Contents(ApiUrl)),
    
    // data array'ini al
    data = Source[data],
    
    // Liste'yi tabloya çevir
    ConvertedToTable = Table.FromList(data, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    
    // Record'ları expand et
    ExpandedColumn = Table.ExpandRecordColumn(ConvertedToTable, "Column1", 
        {
            "marka", "brandId", "opsiyonKodu", 
            "urunGrubu", "subCategoryId", "urunAltGrup", "subSubCategoryId",
            "fashionPyramid", "fashionPyramidId",
            "lifeStyleGrup", "lifeStyleGrupId",
            "ft", "ftId",
            "segment", "segmentId",
            "planOptionSay", "gerceklesenOptionSay",
            "gerceklesenUrunKodu", "gerceklesenRenkKodu", "gerceklesenRenkAdi", 
            "gerceklesenFreeFieldFive",
            "gerceklesenPsf", "gerceklesenOnAdet", "gerceklesenPlanlananAdet",
            "gerceklesenHedefMarkUp", "gerceklesenAlimHedefFiyati"
        }, 
        {
            "Marka", "BrandId", "Opsiyon Kodu", 
            "Ürün Grubu", "SubCategoryId", "Ürün Alt Grup", "SubSubCategoryId",
            "Fashion Pyramid", "FashionPyramidId",
            "Life Style Grup", "LifeStyleGrupId",
            "FT", "FTId",
            "Segment", "SegmentId",
            "Plan Option Sayısı", "Gerçekleşen Option Sayısı",
            "Gerçekleşen Ürün Kodu", "Gerçekleşen Renk Kodu", "Gerçekleşen Renk Adı",
            "Ana Tema Kodu",
            "PSF", "Ön Adet", "Planlanan Adet",
            "Hedef MarkUp", "Alım Hedef Fiyatı"
        }
    ),
    
    // Veri tiplerini ayarla
    ChangedType = Table.TransformColumnTypes(ExpandedColumn,{
        {"BrandId", Int64.Type}, 
        {"SubCategoryId", Int64.Type}, 
        {"SubSubCategoryId", Int64.Type},
        {"FashionPyramidId", Int64.Type},
        {"LifeStyleGrupId", Int64.Type},
        {"FTId", Int64.Type},
        {"SegmentId", Int64.Type},
        {"Plan Option Sayısı", Int64.Type}, 
        {"Gerçekleşen Option Sayısı", Int64.Type},
        {"Ön Adet", type number},
        {"Planlanan Adet", type number},
        {"Hedef MarkUp", type number},
        {"Alım Hedef Fiyatı", type number},
        {"Marka", type text}, 
        {"Opsiyon Kodu", type text},
        {"Ürün Grubu", type text},
        {"Ürün Alt Grup", type text},
        {"Fashion Pyramid", type text},
        {"Life Style Grup", type text},
        {"FT", type text},
        {"Segment", type text},
        {"Gerçekleşen Ürün Kodu", type text},
        {"Gerçekleşen Renk Kodu", type text},
        {"Gerçekleşen Renk Adı", type text},
        {"Ana Tema Kodu", type text},
        {"PSF", type text}
    })
in
    ChangedType
