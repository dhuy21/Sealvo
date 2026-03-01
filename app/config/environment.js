const NODE_ENV = process.env.NODE_ENV || 'development';

const isProduction = () => NODE_ENV === 'production';
const isStaging = () => NODE_ENV === 'staging';
const isDevelopment = () => NODE_ENV === 'development';
const isProductionLike = () => isProduction() || isStaging();

const getBaseUrl = () => process.env.BASE_URL || 'https://www.sealvo.it.com';

module.exports = {
  isProduction,
  isStaging,
  isDevelopment,
  isProductionLike,
  getBaseUrl,
};
