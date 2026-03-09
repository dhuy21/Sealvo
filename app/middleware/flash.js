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

function flashToLocalsMiddleware(req, res, next) {
  res.locals.flashMessage = getFlash(req);
  next();
}

module.exports = { setFlash, getFlash, flashToLocalsMiddleware };
