const { initializeSecurity } = require('./security');
const { initializeSession } = require('./session');
const { initializeCsrf } = require('./csrf');
const { initializeInputSanitization } = require('./inputSanitization');
const { flashToLocalsMiddleware } = require('./flash');
const { getBaseUrl } = require('../config/environment');

const initializeMiddleware = (app) => {
  initializeInputSanitization(app);
  initializeSecurity(app);
  initializeSession(app);
  initializeCsrf(app);
  app.use(flashToLocalsMiddleware);

  app.use((req, res, next) => {
    res.locals.baseUrl = getBaseUrl();
    next();
  });
};

module.exports = {
  initializeMiddleware,
  initializeSecurity,
  initializeSession,
  initializeCsrf,
  initializeInputSanitization,
};
