/**
 * Flash messages (session-based, one-time display after redirect).
 * Use instead of passing ?error= or ?message= in URL.
 *
 * setFlash(req, type, message)  - before redirect
 * getFlash(req)                 - returns { type, message } or null and clears session (used internally)
 * flashToLocalsMiddleware       - injects res.locals.flashMessage for every view (call after session)
 */

function setFlash(req, type, message) {
  if (!req.session) return;
  req.session.flashMessage = { type: type || 'error', message: message || '' };
}

function getFlash(req) {
  if (!req.session) return null;
  const flash = req.session.flashMessage || null;
  if (flash) delete req.session.flashMessage;
  return flash;
}

/** Middleware: expose flash to all views via res.locals.flashMessage so controllers don't have to pass it. */
function flashToLocalsMiddleware(req, res, next) {
  res.locals.flashMessage = getFlash(req);
  next();
}

module.exports = { setFlash, getFlash, flashToLocalsMiddleware };
