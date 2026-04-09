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
        {
         // --- Kimlik alanları ---
         "opsiyonKodu",
         "styleId", "styleCode", "numericValue1", "styleQuantity", "deliveryIdList", "remark",
         
         // --- Style boyutları ---
         "season", "styleStatus",
         "division",
         "marka", "brandId",
         "urunGrubu", "subCategoryId",
         "urunAltGrubu", "subSubCategoryId",
         "marketField3", "marketField5",
         "udf5", "udf5Id",
         
         // --- Colorway boyutları ---
         "colorwayId", "colorwayCode", "colorwayName", "colorwayStatus",
         "minimumQuantity", "quantity",
         "colorwayUserField1", "colorwayUserField4", "colorwayUserField5",
         "freeFieldOne", "freeFieldFive", "freeFieldThree",
         "cud4", "cud4Id", "cud5", "cud5Id",
         
         // --- Tema ---
         "themeCode", "themeName", "themeDescription",
         
         // --- Tedarikçi & Costing ---
         "supplierName",
         "hasCostingData", "styleCostingSupplierId",
         
         // --- Cost Elements ---
         "SPSF", "RPSF", "RMU", "TCOST", "RHDF", "ALMTRY", "FOB", "DFOB",
         "TKMS", "TAST", "TISL", "TTRM", "TISC", "TDGR", "MCOST",
         "KHDF", "KPRC", "KKUR", "KSARF", "AKMS",
         "APRC", "ASARF", "AKUR", "AAST",
         "G1PRC", "G1SARF", "G1KUR", "G2PRC", "G2SARF", "G2KUR",
         "G3PRC", "G3SARF", "G3KUR", "AGARN",
         "IPRC", "IKUR", "AISL",
         "KEPRC", "KEKUR", "AKEM", "ATRM", "ADGR", "AISC",
         "MU", "KDV", "VRG", "NAVL", "GKUR",
         
         // --- Extended Fields ---
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
        {
         // --- Kimlik alanları ---
         "opsiyonKodu",
         "styleId", "styleCode", "numericValue1", "styleQuantity", "deliveryIdList", "remark",
         
         // --- Style boyutları ---
         "season", "styleStatus",
         "division",
         "marka", "brandId",
         "urunGrubu", "subCategoryId",
         "urunAltGrubu", "subSubCategoryId",
         "marketField3", "marketField5",
         "udf5", "udf5Id",
         
         // --- Colorway boyutları ---
         "colorwayId", "colorwayCode", "colorwayName", "colorwayStatus",
         "minimumQuantity", "quantity",
         "colorwayUserField1", "colorwayUserField4", "colorwayUserField5",
         "freeFieldOne", "freeFieldFive", "freeFieldThree",
         "cud4", "cud4Id", "cud5", "cud5Id",
         
         // --- Tema ---
         "themeCode", "themeName", "themeDescription",
         
         // --- Tedarikçi & Costing ---
         "supplierName",
         "hasCostingData", "styleCostingSupplierId",
         
         // --- Cost Elements ---
         "SPSF", "RPSF", "RMU", "TCOST", "RHDF", "ALMTRY", "FOB", "DFOB",
         "TKMS", "TAST", "TISL", "TTRM", "TISC", "TDGR", "MCOST",
         "KHDF", "KPRC", "KKUR", "KSARF", "AKMS",
         "APRC", "ASARF", "AKUR", "AAST",
         "G1PRC", "G1SARF", "G1KUR", "G2PRC", "G2SARF", "G2KUR",
         "G3PRC", "G3SARF", "G3KUR", "AGARN",
         "IPRC", "IKUR", "AISL",
         "KEPRC", "KEKUR", "AKEM", "ATRM", "ADGR", "AISC",
         "MU", "KDV", "VRG", "NAVL", "GKUR",
         
         // --- Extended Fields ---
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
        // Kimlik
        {"opsiyonKodu",          type text},
        {"styleId",              Int64.Type},
        {"styleCode",            type text},
        {"numericValue1",        type number},
        {"styleQuantity",        type number},
        {"deliveryIdList",       type text},
        {"remark",               type text},
        // Style boyutları
        {"season",               type text},
        {"styleStatus",          type text},
        {"division",             type text},
        {"marka",                type text},
        {"brandId",              Int64.Type},
        {"urunGrubu",            type text},
        {"subCategoryId",        Int64.Type},
        {"urunAltGrubu",         type text},
        {"subSubCategoryId",     Int64.Type},
        {"marketField3",         type text},
        {"marketField5",         type text},
        {"udf5",                 type text},
        {"udf5Id",               Int64.Type},
        // Colorway boyutları
        {"colorwayId",           Int64.Type},
        {"colorwayCode",         type text},
        {"colorwayName",         type text},
        {"colorwayStatus",       Int64.Type},
        {"minimumQuantity",      type number},
        {"quantity",             type number},
        {"colorwayUserField1",   Int64.Type},
        {"colorwayUserField4",   Int64.Type},
        {"colorwayUserField5",   Int64.Type},
        {"freeFieldOne",         type text},
        {"freeFieldFive",        type text},
        {"freeFieldThree",       type text},
        {"cud4",                 type text},
        {"cud4Id",               Int64.Type},
        {"cud5",                 type text},
        {"cud5Id",               Int64.Type},
        // Tema
        {"themeCode",            type text},
        {"themeName",            type text},
        {"themeDescription",     type text},
        // Tedarikçi & Costing
        {"supplierName",         type text},
        {"hasCostingData",       type logical},
        {"styleCostingSupplierId", Int64.Type},
        // Cost Elements - number
        {"SPSF", type number}, {"RPSF", type number}, {"RMU", type number},
        {"TCOST", type number}, {"RHDF", type number}, {"ALMTRY", type number},
        {"FOB", type number}, {"DFOB", type number}, {"TKMS", type number},
        {"TAST", type number}, {"TISL", type number}, {"TTRM", type number},
        {"TISC", type number}, {"TDGR", type number}, {"MCOST", type number},
        {"KHDF", type number}, {"KPRC", type number}, {"KKUR", type number},
        {"KSARF", type number}, {"AKMS", type number}, {"APRC", type number},
        {"ASARF", type number}, {"AKUR", type number}, {"AAST", type number},
        {"G1PRC", type number}, {"G1SARF", type number}, {"G1KUR", type number},
        {"G2PRC", type number}, {"G2SARF", type number}, {"G2KUR", type number},
        {"G3PRC", type number}, {"G3SARF", type number}, {"G3KUR", type number},
        {"AGARN", type number}, {"IPRC", type number}, {"IKUR", type number},
        {"AISL", type number}, {"KEPRC", type number}, {"KEKUR", type number},
        {"AKEM", type number}, {"ATRM", type number}, {"ADGR", type number},
        {"AISC", type number}, {"MU", type number}, {"KDV", type number},
        {"VRG", type number}, {"NAVL", type number}, {"GKUR", type number},
        // Extended Fields - number
        {"Cost10", type number}, {"MarkUp", type number}, {"SegmentPSF", type number},
        {"Alım Fiyatı_USD", type number}, {"Alım Fiyatı_TRY", type number},
        {"PSFTarget", type number}, {"Cost1", type number}, {"Cost2", type number},
        {"Cost3", type number}, {"Cost4", type number}, {"Cost5", type number},
        {"Cost6", type number}, {"Cost7", type number}, {"Cost8", type number},
        {"Cost9", type number}, {"Cost11", type number}, {"Cost12", type number},
        {"Cost13", type number}, {"Cost14", type number},
        {"Cur1", type number}, {"Cur2", type number}, {"Cur3", type number}, {"Cur4", type number},
        {"KumasTutar", type number}, {"AstarveGarni", type number}, {"Iscilik", type number},
        {"KemerveTrim", type number}, {"IslemeTutar", type number}, {"Diger", type number},
        {"KumasHedefMaliyet", type number},
        {"En", type number}, {"Yukseklik", type number}, {"AstarSarf", type number}, {"Dolgu", type number},
        // Extended Fields - text
        {"SelectLocal", type text}, {"CostLock", type text},
        {"KolTipi", type text}, {"PacaTipi", type text}, {"Desen", type text},
        {"Yaka", type text}, {"Astar", type text}, {"KolBoyu", type text},
        {"Isleme", type text}, {"Kalinlik", type text}, {"Bel", type text},
        {"BoyOlcu", type text}, {"Kalip", type text}, {"PacaBoyu", type text},
        {"KapamaSekli", type text}, {"Kemer", type text}, {"CepTipi", type text},
        {"Pano", type text}, {"Cep", type text}, {"KumasTipi", type text},
        {"GerceklesenTedarikSekli", type text}, {"shoppingid", type text},
        {"Materyal", type text}, {"SelectUretim", type text}, {"SelectYD", type text},
        {"Hedef", type text}, {"PSFTargetCin", type number}, {"Detay", type text},
        {"Esin Kaynağı - Kullanım Alanı", type text},
        {"RafOmru", type number}, {"ParcaSayisi", Int64.Type},
        {"ReklamUrunu", type text}, {"Benzerlik Tipi", type text},
        {"Takım Parçası Var", type text}
    })
in
    #"Changed Type"
