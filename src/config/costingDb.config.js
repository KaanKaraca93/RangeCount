/**
 * IpekyolCostingDB API Configuration
 *
 * RangeSayac plan verileri (eski RangeSayacv6_2.xlsx / Rangesayacv7_2.xlsx) artık
 * bu servisin `?format=plan` uçlarından okunuyor. Uçlar, ilgili Excel'lerin kolon
 * adlarıyla birebir aynı JSON döndürür; bu yüzden eşleştirme mantığı değişmeden kalır.
 *
 *   Option Plan (v6.2): GET /api/option-plan-parametreleri?format=plan
 *   Range Plan  (v7.2): GET /api/range-plan-parametreleri?format=plan
 */

const COSTINGDB_CONFIG = {
  baseUrl: (process.env.COSTINGDB_API_URL || 'https://costingdb-8538ae5b78bc.herokuapp.com').replace(/\/+$/, ''),

  // Plan uçları (Excel yerine kaynak)
  endpoints: {
    optionPlan: '/api/option-plan-parametreleri?format=plan',
    rangePlan: '/api/range-plan-parametreleri?format=plan'
  },

  // Heroku dyno soğuk başlatması + veri boyutu için makul bir zaman aşımı
  timeoutMs: Number(process.env.COSTINGDB_API_TIMEOUT_MS || 60000)
};

console.log(`🔧 CostingDB API base URL: ${COSTINGDB_CONFIG.baseUrl}`);

module.exports = COSTINGDB_CONFIG;
