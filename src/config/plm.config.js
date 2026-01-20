/**
 * PLM/ION API Configuration
 * OAuth2.0 credentials for Infor CloudSuite
 * Supports both TEST and PRODUCTION environments via environment variables
 */

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';

// Test environment credentials (default)
const TEST_CONFIG = {
  tenantId: 'ATJZAMEWEF5P4SNV_TST',
  clientName: 'BackendServisi',
  clientId: 'ATJZAMEWEF5P4SNV_TST~vlWkwz2P74KAmRFfihVsdK5yjnHvnfPUrcOt4nl6gkI',
  clientSecret: 'HU1TUcBOX1rkp-uuYKUQ3simFEYzPKNM-XIyf4ewIxe-TYUZOK7RAlXUPd_FwSZMAslt8I9RZmv23xItVKY8EQ',
  serviceAccountAccessKey: 'ATJZAMEWEF5P4SNV_TST#5d3TLFCMqK_CR9wmWsLbIn1UnLv2d8S0ohtIX4TZ4PUBXyvtx-RjHjscLzfB9NBAGZfdWMgzFt3DCpWoJMOHEg',
  serviceAccountSecretKey: 'g0oBJ4ubPxJwgJZjAxAfguExlH3V5-cFF0zove_9Fb_7h4C67eXko45T9Ltjw-DYzfYUbU_iQbCZuTW6wYeX5Q'
};

// Production environment credentials
const PROD_CONFIG = {
  tenantId: 'ATJZAMEWEF5P4SNV_PRD',
  clientName: 'BackendServisi',
  clientId: 'ATJZAMEWEF5P4SNV_PRD~zWbsEgkMBlqdSXoSAXBiM8V1POA0-2Mkn1qkORhxma0',
  clientSecret: 'Ll2ehfOJ14uXzyLwR-6BIUmnQNFfhSFRadOzhfzIgK8DBs0x8_AQ3vqbiNrCVOfTyN3_v_Vyf1Yq4WMA7F68hg',
  serviceAccountAccessKey: 'ATJZAMEWEF5P4SNV_PRD#fAzHs-Kdtut0xOXsRx1rnc4kB9icdTJ25HPE65-3-Q0G477cLbXRgPOsL0JjhQCA2VlgbJvK400_9ZaezhMKIQ',
  serviceAccountSecretKey: 'Bd7aqwQd7K8Xw8uMLffxlNrM8oROajrY18EVpPalakqECxXs5HzFzZoT45JBKtUGZvfacr8bCrgCmgscu71rTA'
};

// Select environment config
const envConfig = isProduction ? PROD_CONFIG : TEST_CONFIG;

// Build final config
const PLM_CONFIG = {
  // Tenant Information
  tenantId: process.env.PLM_TENANT_ID || envConfig.tenantId,
  clientName: process.env.PLM_CLIENT_NAME || envConfig.clientName,
  
  // OAuth2.0 Credentials
  clientId: process.env.PLM_CLIENT_ID || envConfig.clientId,
  clientSecret: process.env.PLM_CLIENT_SECRET || envConfig.clientSecret,
  
  // Service Account Keys
  serviceAccountAccessKey: process.env.PLM_SERVICE_ACCOUNT_ACCESS_KEY || envConfig.serviceAccountAccessKey,
  serviceAccountSecretKey: process.env.PLM_SERVICE_ACCOUNT_SECRET_KEY || envConfig.serviceAccountSecretKey,
  
  // URLs
  ionApiUrl: process.env.PLM_ION_API_URL || 'https://mingle-ionapi.eu1.inforcloudsuite.com',
  providerUrl: process.env.PLM_PROVIDER_URL || `https://mingle-sso.eu1.inforcloudsuite.com:443/${envConfig.tenantId}/as/`,
  
  // OAuth2.0 Endpoints
  endpoints: {
    authorization: 'authorization.oauth2',
    token: 'token.oauth2',
    revoke: 'revoke_token.oauth2'
  },
  
  // Other
  delegationType: '12',
  version: '1.1',
  eventVersion: 'V1480769020',
  
  // Season ID for filtering
  seasonId: process.env.PLM_SEASON_ID || 1
};

// Log current environment
console.log(`🔧 PLM Config loaded for: ${isProduction ? 'PRODUCTION' : 'TEST'} (${PLM_CONFIG.tenantId})`);

module.exports = PLM_CONFIG;

