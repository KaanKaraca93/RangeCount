const XLSX = require('xlsx');
const axios = require('axios');
const PLM_CONFIG = require('./src/config/plm.config');
const tokenService = require('./src/services/tokenService');

async function debugFitIssue() {
  try {
    console.log('🔍 IW6260002151 için Fit eşleşmesini debug ediyoruz...\n');

    // 1. Excel'den plan verilerini oku
    const workbook = XLSX.readFile('Rangesayacv5.xlsx');
    const worksheet = workbook.Sheets['Sayfa1'];
    const planData = XLSX.utils.sheet_to_json(worksheet);

    console.log('📊 Excel Plan Verileri (FIT için):');
    const fitPlans = planData.filter(p => p.RangeTag === 'FIT' || p.Range === 'Fit');
    fitPlans.forEach(p => {
      console.log(`  - ${p.Marka} | ${p['Ürün Gurbu']} | ${p.RangeTag} | ${p['Range Detayı']} | DropDownValue: ${p.DropDownValue} | CUD5Id: ${p.CUD5Id} | Option Say: ${p['Option Say']}`);
    });

    // 2. PLM'den bu spesifik StyleCode'u çek
    const authHeader = await tokenService.getAuthorizationHeader();
    const url = `${PLM_CONFIG.ionApiUrl}/${PLM_CONFIG.tenantId}/FASHIONPLM/odata2/api/odata2/Style`;
    
    const params = {
      '$filter': 'StyleId eq 11925',
      '$select': 'StyleId,StyleCode',
      '$expand': 'styleextendedfieldvalues($select=DropdownValues,Id,ExtFldId;$filter=ExtFldId eq e8b38ebc-0c41-4bdf-b228-f3ba7d136dd0 or ExtFldId eq b37df9ef-7877-4f8a-b850-b5335cc790db or ExtFldId eq a8af8331-0c65-49e1-94aa-e2abac635749 or ExtFldId eq 0e41ca5e-d812-47e5-8b5b-3e018294683b or ExtFldId eq c075b044-335f-4129-a5e7-c51745591e25 or ExtFldId eq cc4fdbe7-c46e-41e7-8047-29793bccfdd0 or ExtFldId eq 38ba7340-72b8-434b-a246-def36b7db42a;$expand=StyleExtendedFields($select=Name)),brand,SubCategory,ProductSubSubCategory,UserDefinedField5,StyleColorways($select=StyleColorwayId,Code,Name,FreeFieldOne;$expand=ColorwayUserDefinedField5;$filter=ColorwayStatus ne 4)'
    };

    const response = await axios.get(url, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      params: params
    });

    console.log('\n🔵 PLM Response:');
    if (response.data.value.length === 0) {
      console.log('❌ Bu StyleCode için sonuç bulunamadı!');
      return;
    }

    const style = response.data.value[0];
    console.log(`StyleId: ${style.StyleId}`);
    console.log(`StyleCode: ${style.StyleCode}`);
    console.log(`Brand: ${style.Brand?.Name} (Id: ${style.Brand?.Id})`);
    console.log(`SubCategory: ${style.SubCategory?.Name}`);
    console.log(`SubSubCategory: ${style.ProductSubSubCategory?.Name} (Id: ${style.ProductSubSubCategory?.Id})`);
    console.log(`UDF5: ${style.UserDefinedField5?.Name}`);

    console.log('\n🎨 Colorways:');
    if (style.StyleColorways) {
      style.StyleColorways.forEach(cw => {
        console.log(`  - ${cw.Code} ${cw.Name} | Cluster: ${cw.FreeFieldOne} | CUD5: ${cw.ColorwayUserDefinedField5?.Name} (Id: ${cw.ColorwayUserDefinedField5?.Id})`);
      });
    }

    console.log('\n📏 Extended Field Values (Range Attributes):');
    if (style.StyleExtendedFieldValues) {
      // Dropdown API'den isimleri al
      const dropdownUrl = `${PLM_CONFIG.ionApiUrl}/${PLM_CONFIG.tenantId}/FASHIONPLM/odata2/api/odata2/ExtendedFieldDropDown`;
      const dropdownParams = {
        '$filter': 'ExtFldId eq e8b38ebc-0c41-4bdf-b228-f3ba7d136dd0 or ExtFldId eq b37df9ef-7877-4f8a-b850-b5335cc790db or ExtFldId eq a8af8331-0c65-49e1-94aa-e2abac635749 or ExtFldId eq 0e41ca5e-d812-47e5-8b5b-3e018294683b or ExtFldId eq c075b044-335f-4129-a5e7-c51745591e25 or ExtFldId eq cc4fdbe7-c46e-41e7-8047-29793bccfdd0 or ExtFldId eq 38ba7340-72b8-434b-a246-def36b7db42a'
      };
      const dropdownResponse = await axios.get(dropdownUrl, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        params: dropdownParams
      });

      const dropdownMap = {};
      dropdownResponse.data.value.forEach(item => {
        dropdownMap[item.ExtFldDropDownId] = item.Name;
      });

      style.StyleExtendedFieldValues.forEach(extField => {
        const fieldName = extField.StyleExtendedFields?.Name;
        const dropdownValues = extField.DropdownValues;
        
        console.log(`  - ${fieldName} (ExtFldId: ${extField.ExtFldId})`);
        console.log(`    DropdownValues: "${dropdownValues}"`);
        
        if (dropdownValues && dropdownValues !== '') {
          const dropdownIds = dropdownValues.split(',').map(v => parseInt(v.trim()));
          dropdownIds.forEach(id => {
            console.log(`      → ${id}: ${dropdownMap[id] || 'BULUNAMADI'}`);
          });
        }
      });
    }

    // 3. Eşleştirme mantığını simüle et
    console.log('\n🔍 Eşleştirme Analizi:');
    const brandId = style.Brand?.Id;
    const subSubCategoryId = style.ProductSubSubCategory?.Id;

    style.StyleColorways?.forEach(colorway => {
      console.log(`\n  Colorway: ${colorway.Code} ${colorway.Name}`);
      const cud5Id = colorway.ColorwayUserDefinedField5?.Id || null;
      
      if (colorway.FreeFieldOne !== 'B') {
        console.log(`    ❌ Cluster ${colorway.FreeFieldOne} olduğu için SKIP`);
        return;
      }

      style.StyleExtendedFieldValues?.forEach(extField => {
        const fieldName = extField.StyleExtendedFields?.Name;
        const dropdownValues = extField.DropdownValues;
        
        if (!dropdownValues || dropdownValues === '') {
          return;
        }

        const dropdownIds = dropdownValues.split(',').map(v => parseInt(v.trim()));
        
        dropdownIds.forEach(dropDownValue => {
          const key = `${brandId}_${subSubCategoryId}_${extField.ExtFldId}_${dropDownValue}_${cud5Id}`;
          
          console.log(`    🔑 ${fieldName}: ${dropDownValue}`);
          console.log(`       Key: ${key}`);
          
          // Excel'de bu key'e karşılık gelen planı bul
          const matchingPlans = planData.filter(p => {
            const planKey = `${p.BrandId}_${p.SubSubCategoryId}_${p.ExtFldId}_${p.DropDownValue}_${p.CUD5Id}`;
            return planKey === key;
          });
          
          if (matchingPlans.length > 0) {
            console.log(`       ✅ EŞLEŞME BULUNDU! Plan'da ${matchingPlans.length} adet placeholder var (${matchingPlans[0]['Option Say']} option)`);
            console.log(`          → ${matchingPlans[0].RangeTag}: ${matchingPlans[0]['Range Detayı']}`);
          } else {
            console.log(`       ⚠️ EŞLEŞME YOK!`);
            
            // Hangi kriterin uymadığını kontrol et
            const similarPlans = planData.filter(p => 
              p.BrandId === brandId && 
              p.SubSubCategoryId === subSubCategoryId && 
              p.ExtFldId === extField.ExtFldId
            );
            
            if (similarPlans.length > 0) {
              console.log(`          Plan'da bu range için şunlar var:`);
              similarPlans.forEach(sp => {
                console.log(`          - DropDownValue: ${sp.DropDownValue}, CUD5Id: ${sp.CUD5Id} (${sp['Range Detayı']})`);
              });
            }
          }
        });
      });
    });

  } catch (error) {
    console.error('❌ Hata:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

debugFitIssue();
