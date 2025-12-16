const express = require('express');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger.config');
const tokenRoutes = require('./routes/token.routes');
const rangeRoutes = require('./routes/range.routes');

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
      rangesProduct: '/api/ranges/product/:group'
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
});

module.exports = app;

