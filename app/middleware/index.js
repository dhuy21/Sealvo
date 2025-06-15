const { initializeSecurity } = require('./security');
const { initializeSession } = require('./session');
const { initializeInputSanitization } = require('./inputSanitization');

/**
 * Initialize all middleware in the correct order
 * @param {Express} app - Express application instance
 */
const initializeMiddleware = (app) => {
  console.log('Initializing security middleware...');
  
  // 1. Input sanitization (must be early in the pipeline)
  initializeInputSanitization(app);
  
  // 2. Security headers and CSP (after sanitization, before sessions)
  initializeSecurity(app);
  
  // 3. Session management (after security headers)
  initializeSession(app);
  
  console.log('All security middleware initialized successfully');
};

module.exports = {
  initializeMiddleware,
  // Export individual initializers for flexibility
  initializeSecurity,
  initializeSession,
  initializeInputSanitization
}; 