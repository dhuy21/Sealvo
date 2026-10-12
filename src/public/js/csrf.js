/**
 * CSRF fetch interceptor — Double-Submit Cookie pattern.
 * Automatically injects X-CSRF-Token header on every mutating fetch() call
 * so existing code does not need any modification.
 */
(function () {
  var HEADER = 'X-CSRF-Token';

  function getCsrfToken() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
  }

  var _fetch = window.fetch;

  window.fetch = function (url, options) {
    options = options || {};
    var method = (options.method || 'GET').toUpperCase();

    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      if (options.headers instanceof Headers) {
        if (!options.headers.has(HEADER)) {
          options.headers.set(HEADER, getCsrfToken());
        }
      } else {
        options.headers = options.headers || {};
        if (!options.headers[HEADER]) {
          options.headers[HEADER] = getCsrfToken();
        }
      }
    }

    return _fetch.call(this, url, options);
  };

  window.getCsrfToken = getCsrfToken;
})();
