let
    // API endpoint
    ApiUrl = "https://rangecount-652fcc1f20d9.herokuapp.com/api/style-costing",
    
    // API'den veri çek
    Source = Json.Document(Web.Contents(ApiUrl)),
    
    // data array'ini al
    data = Source[data],
    
    // Liste'yi tabloya çevir
    #"Converted to Table" = Table.FromList(data, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    
    // Record'ları genişlet
    #"Expanded Column1" = Table.ExpandRecordColumn(#"Converted to Table", "Column1", 
        {"styleId", "styleCode", "numericValue1", "quantity", "deliveryIdList", "remark", 
         "season", "styleStatus", "marka", "brandId", "urunGrubu", "subCategoryId", 
         "urunAltGrubu", "subSubCategoryId", "marketField5", "udf5", "udf5Id",
         "colorwayId", "colorwayCode", "colorwayName", "colorwayStatus", "minimumQuantity",
         "colorwayUserField1", "colorwayUserField4", "colorwayUserField5", 
         "freeFieldOne", "freeFieldFive", "cud4", "cud4Id", "cud5", "cud5Id",
         "themeCode", "themeName", "themeDescription", 
         "hasCostingData", "styleCostingSupplierId",
         // Cost Elements (47 adet - hepsini listele)
         "SPSF", "RPSF", "RMU", "TCOST", "RHDF", "ALMTRY", "FOB", "DFOB",
         "TKMS", "TAST", "TISL", "TTRM", "TISC", "TDGR", "MCOST",
         "KHDF", "KPRC", "KKUR", "KSARF", "AKMS",
         "APRC", "ASARF", "AKUR", "AAST",
         "G1PRC", "G1SARF", "G1KUR", "G2PRC", "G2SARF", "G2KUR",
         "G3PRC", "G3SARF", "G3KUR", "AGARN",
         "IPRC", "IKUR", "AISL",
         "KEPRC", "KEKUR", "AKEM", "ATRM", "ADGR", "AISC",
         "MU", "KDV", "VRG", "NAVL", "GKUR",
         // Extended Fields (örnek - sen tamamla)
         "Cost10", "MarkUp", "SegmentPSF", "Alım Fiyatı_USD", "Alım Fiyatı_TRY",
         "PSFTarget", "SelectLocal", "Cost1", "Cost2", "Cost3", "Cost4", "Cost5",
         "Cost6", "Cost7", "Cost8", "Cost9", "Cost11", "Cost12", "Cost13", "Cost14",
         "Cur1", "Cur2", "Cur3", "Cur4",
         "KumasTutar", "AstarveGarni", "Iscilik", "KemerveTrim", "IslemeTutar", "Diger",
         "KumasHedefMaliyet", "CostLock",
         "En", "Yukseklik", "AstarSarf", "Dolgu",
         "KolTipi", "ParcaSayisi", "PacaTipi", "Desen", "Yaka", "Astar",
         "KolBoyu", "Isleme", "Kalinlik", "Bel", "BoyOlcu", "Kalip",
         "PacaBoyu", "KapamaSekli", "Kemer", "CepTipi", "Pano", "Cep",
         "RafOmru", "Takım Parçası Var", "ReklamUrunu", "Benzerlik Tipi",
         "KumasTipi", "GerceklesenTedarikSekli", "shoppingid", "Materyal",
         "SelectUretim", "SelectYD", "Hedef", "PSFTargetCin", "Detay", "Esin Kaynağı - Kullanım Alanı"
        }, 
        {"styleId", "styleCode", "numericValue1", "quantity", "deliveryIdList", "remark",
         "season", "styleStatus", "marka", "brandId", "urunGrubu", "subCategoryId",
         "urunAltGrubu", "subSubCategoryId", "marketField5", "udf5", "udf5Id",
         "colorwayId", "colorwayCode", "colorwayName", "colorwayStatus", "minimumQuantity",
         "colorwayUserField1", "colorwayUserField4", "colorwayUserField5",
         "freeFieldOne", "freeFieldFive", "cud4", "cud4Id", "cud5", "cud5Id",
         "themeCode", "themeName", "themeDescription",
         "hasCostingData", "styleCostingSupplierId",
         // Cost Elements
         "SPSF", "RPSF", "RMU", "TCOST", "RHDF", "ALMTRY", "FOB", "DFOB",
         "TKMS", "TAST", "TISL", "TTRM", "TISC", "TDGR", "MCOST",
         "KHDF", "KPRC", "KKUR", "KSARF", "AKMS",
         "APRC", "ASARF", "AKUR", "AAST",
         "G1PRC", "G1SARF", "G1KUR", "G2PRC", "G2SARF", "G2KUR",
         "G3PRC", "G3SARF", "G3KUR", "AGARN",
         "IPRC", "IKUR", "AISL",
         "KEPRC", "KEKUR", "AKEM", "ATRM", "ADGR", "AISC",
         "MU", "KDV", "VRG", "NAVL", "GKUR",
         // Extended Fields
         "Cost10", "MarkUp", "SegmentPSF", "Alım Fiyatı_USD", "Alım Fiyatı_TRY",
         "PSFTarget", "SelectLocal", "Cost1", "Cost2", "Cost3", "Cost4", "Cost5",
         "Cost6", "Cost7", "Cost8", "Cost9", "Cost11", "Cost12", "Cost13", "Cost14",
         "Cur1", "Cur2", "Cur3", "Cur4",
         "KumasTutar", "AstarveGarni", "Iscilik", "KemerveTrim", "IslemeTutar", "Diger",
         "KumasHedefMaliyet", "CostLock",
         "En", "Yukseklik", "AstarSarf", "Dolgu",
         "KolTipi", "ParcaSayisi", "PacaTipi", "Desen", "Yaka", "Astar",
         "KolBoyu", "Isleme", "Kalinlik", "Bel", "BoyOlcu", "Kalip",
         "PacaBoyu", "KapamaSekli", "Kemer", "CepTipi", "Pano", "Cep",
         "RafOmru", "Takım Parçası Var", "ReklamUrunu", "Benzerlik Tipi",
         "KumasTipi", "GerceklesenTedarikSekli", "shoppingid", "Materyal",
         "SelectUretim", "SelectYD", "Hedef", "PSFTargetCin", "Detay", "Esin Kaynağı - Kullanım Alanı"
        }),
    
    // Veri tiplerini ayarla
    #"Changed Type" = Table.TransformColumnTypes(#"Expanded Column1",{
        {"styleId", Int64.Type},
        {"styleCode", type text},
        {"numericValue1", Int64.Type},
        {"quantity", Int64.Type},
        {"deliveryIdList", type text},
        {"remark", type text},
        {"season", type text},
        {"styleStatus", type text},
        {"marka", type text},
        {"brandId", Int64.Type},
        {"urunGrubu", type text},
        {"subCategoryId", Int64.Type},
        {"urunAltGrubu", type text},
        {"subSubCategoryId", Int64.Type},
        {"marketField5", type text},
        {"colorwayId", Int64.Type},
        {"colorwayCode", type text},
        {"colorwayName", type text},
        {"colorwayStatus", Int64.Type},
        {"minimumQuantity", type number},
        {"colorwayUserField1", Int64.Type},
        {"colorwayUserField4", Int64.Type},
        {"colorwayUserField5", Int64.Type},
        {"freeFieldOne", type text},
        {"freeFieldFive", type text},
        {"themeCode", type text},
        {"themeName", type text},
        {"themeDescription", type text},
        {"hasCostingData", type logical},
        {"styleCostingSupplierId", Int64.Type},
        // Cost Elements - number
        {"RPSF", type number},
        {"RMU", type number},
        {"TCOST", type number},
        {"FOB", type number},
        {"MU", type number},
        {"MarkUp", type number},
        {"SegmentPSF", type number},
        {"Alım Fiyatı_USD", type number},
        {"Alım Fiyatı_TRY", type number},
        {"Cost10", type number}
        // Diğer alanlar için sen tip ekleyebilirsin
    })
in
    #"Changed Type"
