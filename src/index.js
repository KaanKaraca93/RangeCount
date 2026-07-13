const express = require('express');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger.config');
const tokenRoutes = require('./routes/token.routes');
const rangeRoutes = require('./routes/range.routes');
const rangeDetailRoutes = require('./routes/rangeDetail.routes');
const plmStyleRoutes = require('./routes/plmStyle.routes');
const plmRangeRoutes = require('./routes/plmRange.routes');
const plmThemeRoutes = require('./routes/plmTheme.routes');
const dClusterRoutes = require('./routes/dCluster.routes');
const rangeCountSourceRoutes = require('./routes/rangeCountSource.routes');
const rangeCountSourceV2Routes = require('./routes/rangeCountSourceV2.routes');
const rangeCountSourceV6Routes = require('./routes/rangeCountSourceV6.routes');
const rangeCountSourceV6_2Routes = require('./routes/rangeCountSourceV6_2.routes');
const rangeV7Routes = require('./routes/rangeV7.routes');
const rangeV7_2Routes = require('./routes/rangeV7_2.routes');
const rangeV5Routes = require('./routes/rangeV5.routes');
const styleCostingRoutes = require('./routes/styleCosting.routes');
const bannerRoutes = require('./routes/banner.routes');
const plmThemeCategoryRoutes = require('./routes/plmThemeCategory.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Ipekyol Range Sayaç API Docs'
}));

// Routes
app.use('/api', tokenRoutes);
app.use('/api', rangeRoutes);
app.use('/api', rangeDetailRoutes);
app.use('/api', plmStyleRoutes);
app.use('/api', plmRangeRoutes);
app.use('/api', plmThemeRoutes);
app.use('/api', dClusterRoutes);
app.use('/api', rangeCountSourceRoutes);
app.use('/api/range-count-source-v2', rangeCountSourceV2Routes);
app.use('/api/range-count-source-v6', rangeCountSourceV6Routes);
app.use('/api/range-count-source-v6-2', rangeCountSourceV6_2Routes);
app.use('/api/range-v7', rangeV7Routes);
app.use('/api/range-v7-2', rangeV7_2Routes);
app.use('/api/range-v5', rangeV5Routes);
app.use('/api/style-costing', styleCostingRoutes);
app.use('/api', bannerRoutes);
app.use('/api/theme-category', plmThemeCategoryRoutes);

// Widget HTML endpoint
app.get('/widget.html', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Range Banner Widget</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Source Sans Pro', Arial, sans-serif; background: #ffffff; padding: 16px; }
        .range-banner-widget { max-width: 100%; }
        .widget-header { border-bottom: 2px solid #5c666f; padding-bottom: 12px; margin-bottom: 20px; }
        .widget-title { color: #2c3e50; font-size: 20px; font-weight: 600; margin: 0; }
        .widget-content { display: grid; gap: 24px; }
        .category-section { background: #f8f9fa; border-radius: 6px; padding: 16px; border-left: 4px solid #5c666f; }
        .category-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .category-title { font-size: 16px; font-weight: 600; color: #2c3e50; margin: 0; }
        .category-total { font-size: 24px; font-weight: 700; color: #1D7FF0; }
        .items-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
        .item-card { background: white; border-radius: 4px; padding: 12px; border: 1px solid #e1e4e8; transition: all 0.2s ease; }
        .item-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); transform: translateY(-2px); }
        .item-name { font-size: 14px; font-weight: 600; color: #2c3e50; margin-bottom: 8px; }
        .progress-bar { height: 8px; background: #e1e4e8; border-radius: 4px; overflow: hidden; margin-bottom: 8px; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #1D7FF0 0%, #4A90E2 100%); transition: width 0.3s ease; border-radius: 4px; }
        .item-stats { display: flex; justify-content: space-between; font-size: 12px; color: #5c666f; margin-top: 4px; }
        .stat-value { font-weight: 600; color: #2c3e50; }
        .loading { text-align: center; padding: 40px; color: #5c666f; font-size: 16px; }
        .error { background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 16px; color: #856404; text-align: center; }
        .last-update { text-align: right; font-size: 11px; color: #8899a6; margin-top: 16px; font-style: italic; }
        @media (max-width: 768px) { .items-container { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    <div class="range-banner-widget">
        <div class="widget-header">
            <h3 class="widget-title">📊 Range Tamamlanma Durumu</h3>
        </div>
        <div id="widget-content" class="widget-content">
            <div class="loading">⏳ Veriler yükleniyor...</div>
        </div>
    </div>
    <script>
        const API_URL = 'https://${req.get('host')}/api/banner';
        async function loadData() {
            try {
                const response = await fetch(API_URL);
                if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
                const result = await response.json();
                if (!result.success) throw new Error('Invalid response');
                renderData(result.data);
            } catch (error) {
                document.getElementById('widget-content').innerHTML = \`<div class="error">❌ \${error.message}</div>\`;
            }
        }
        function renderData(data) {
            let html = '';
            if (data.urunKategorisi) html += renderCategory('Ürün Kategorisi', data.urunKategorisi);
            if (data.tema) html += renderCategory('Tema', data.tema);
            html += \`<div class="last-update">Son güncelleme: \${new Date().toLocaleString('tr-TR')}</div>\`;
            document.getElementById('widget-content').innerHTML = html;
        }
        function renderCategory(title, cat) {
            const oran = parseFloat(cat.tamamlanmaOrani) || 0;
            return \`<div class="category-section">
                <div class="category-header">
                    <h4 class="category-title">\${title}</h4>
                    <span class="category-total" style="color: \${oran >= 100 ? '#28a745' : '#1D7FF0'}">\${cat.tamamlanmaOrani}</span>
                </div>
                <div class="items-container">
                    <div class="item-card">
                        <div class="item-name">P Option Toplam</div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: \${Math.min(oran, 100)}%; background: \${oran >= 100 ? 'linear-gradient(90deg, #28a745 0%, #34ce57 100%)' : 'linear-gradient(90deg, #1D7FF0 0%, #4A90E2 100%)'}"></div>
                        </div>
                        <div class="item-stats">
                            <span>P Option: <span class="stat-value">\${cat.toplamPOpt}</span></span>
                            <span>G Option: <span class="stat-value">\${cat.toplamGOpt}</span></span>
                        </div>
                        <div class="item-stats">
                            <span>Fark: <span class="stat-value" style="color: \${cat.fark >= 0 ? '#28a745' : '#dc3545'}">\${cat.fark}</span></span>
                            <span>Oran: <span class="stat-value">\${cat.tamamlanmaOrani}</span></span>
                        </div>
                    </div>
                </div>
            </div>\`;
        }
        loadData();
        setInterval(loadData, 5*60*1000);
    </script>
</body>
</html>`);
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Ipekyol Range Sayaç API',
    version: '1.0.0',
    status: 'running',
    documentation: '/api-docs',
    endpoints: {
      token: '/api/token',
      tokenInfo: '/api/token/info',
      tokenRefresh: '/api/token/refresh',
      tokenRevoke: '/api/token/revoke',
      ranges: '/api/ranges',
      rangesSummary: '/api/ranges/summary',
      rangesLifestyle: '/api/ranges/lifestyle/:group',
      rangesProduct: '/api/ranges/product/:group',
      rangeDetails: '/api/range-details',
      rangeDetailsLifestyle: '/api/range-details/lifestyle/:group',
      rangeDetailsProduct: '/api/range-details/product/:group',
      rangeDetailsFabric: '/api/range-details/fabric/:type',
      rangeDetailsSpecific: '/api/range-details/detail/:lifeStyleGroup/:productGroup',
      rangeDetailsFabricSummary: '/api/range-details/summary/fabric',
      pastSeasonData: 'GET /api/past-season-data',
      plmStyle: '/api/plm-style/:styleId',
      plmRanges: 'GET /api/plm-ranges',
      plmRangesSummary: 'GET /api/plm-ranges/summary',
      plmThemes: 'GET /api/plm-themes',
      plmThemesSummary: 'GET /api/plm-themes/summary',
      plmDCluster: 'GET /api/plm-d-cluster',
      rangeCountSource: 'GET /api/range-count-source',
      rangeCountSourceSummary: 'GET /api/range-count-source/summary',
      rangeV5: 'GET /api/range-v5',
      rangeV5Summary: 'GET /api/range-v5/summary',
      styleCosting: 'GET /api/style-costing',
      styleCostingSummary: 'GET /api/style-costing/summary',
      banner: 'GET /api/banner'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`📚 Swagger Docs: http://localhost:${PORT}/api-docs`);
  console.log(`\n📋 Token Endpoints:`);
  console.log(`   GET  /api/token                    - Get access token`);
  console.log(`   GET  /api/token/info               - Get token info`);
  console.log(`   POST /api/token/refresh            - Refresh token`);
  console.log(`   POST /api/token/revoke             - Revoke token`);
  console.log(`\n📊 Range Endpoints:`);
  console.log(`   GET  /api/ranges                   - Get all ranges`);
  console.log(`   GET  /api/ranges/summary           - Get summary statistics`);
  console.log(`   GET  /api/ranges/lifestyle/:group  - Get by lifestyle group`);
  console.log(`   GET  /api/ranges/product/:group    - Get by product group`);
  console.log(`   POST /api/ranges/reload            - Reload Excel data`);
  console.log(`\n🔍 Range Detail Endpoints:`);
  console.log(`   GET  /api/range-details                             - Get all details`);
  console.log(`   GET  /api/range-details/lifestyle/:group            - Get by lifestyle`);
  console.log(`   GET  /api/range-details/product/:group              - Get by product`);
  console.log(`   GET  /api/range-details/fabric/:type                - Get by fabric type`);
  console.log(`   GET  /api/range-details/detail/:lifestyle/:product  - Specific detail`);
  console.log(`   GET  /api/range-details/summary/fabric              - Fabric summary`);
  console.log(`\n🎨 PLM Style & Past Season Data:`);
  console.log(`   GET  /api/past-season-data                          - Get random past season data (POC)`);
  console.log(`   GET  /api/plm-style/:styleId                        - Get PLM style info (test)`);
  console.log(`\n🔥 PLM Real Range Data:`);
  console.log(`   GET  /api/plm-ranges                                - Get real ranges from PLM`);
  console.log(`   GET  /api/plm-ranges/summary                        - Get PLM range summary`);
  console.log(`\n🎨 PLM Theme Data:`);
  console.log(`   GET  /api/plm-themes                                - Get real themes from PLM`);
  console.log(`   GET  /api/plm-themes/summary                        - Get PLM theme summary`);
  console.log(`\n📦 PLM D-Cluster Data:`);
  console.log(`   GET  /api/plm-d-cluster                             - Get D-Cluster (FreeFieldOne=D) data`);
  console.log(`\n📋 Range Count Source (Placeholder Level):`);
  console.log(`   GET  /api/range-count-source                        - Get placeholder-level plan vs actual`);
  console.log(`   GET  /api/range-count-source/summary                - Get summary statistics`);
  console.log(`\n🎯 Range V5 (Range Feature Tracking):`);
  console.log(`   GET  /api/range-v5                                  - Get range feature tracking`);
  console.log(`   GET  /api/range-v5/summary                          - Get range V5 summary statistics`);
  console.log(`\n💰 Style Costing (Budget Tracking):`);
  console.log(`   GET  /api/style-costing                             - Get style costing data (SupplierId=2)`);
  console.log(`   GET  /api/style-costing/summary                     - Get style costing summary`);
  console.log(`\n📊 Banner Metrics:`);
  console.log(`   GET  /api/banner                                    - Get summary metrics for banner`);
});

module.exports = app;

