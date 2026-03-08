const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const { encode } = require('html-entities');
const validator = require('validator');

const window = new JSDOM('').window;
const purify = DOMPurify(window);

const sanitizationUtils = {
  sanitizeHtml: (input) => {
    if (typeof input !== 'string') return input;
    return purify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });
  },

  encodeHtml: (input) => {
    if (typeof input !== 'string') return input;
    return encode(input);
  },

  sanitizeUsername: (username) => {
    if (!username || typeof username !== 'string') return '';

    let clean = purify.sanitize(username, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    clean = clean.replace(/[<>'"&/\\]/g, '');
    return clean.trim().substring(0, 50);
  },

  sanitizeEmail: (email) => {
    if (!email || typeof email !== 'string') return '';

    let clean = email.toLowerCase().trim();
    if (!validator.isEmail(clean)) {
      throw new Error("Format d'email invalide");
    }

    return clean;
  },

  sanitizeText: (text) => {
    if (!text || typeof text !== 'string') return '';

    let clean = purify.sanitize(text, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
      ALLOWED_ATTR: [],
    });

    clean = clean.replace(/[<>'"&]/g, (match) => {
      const entities = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '&': '&amp;',
      };
      return entities[match];
    });

    return clean.trim();
  },

  sanitizeObject: (obj, fields = {}) => {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized = { ...obj };

    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string') {
        switch (fields[key] || 'text') {
          case 'username':
            sanitized[key] = sanitizationUtils.sanitizeUsername(value);
            break;
          case 'email':
            sanitized[key] = sanitizationUtils.sanitizeEmail(value);
            break;
          case 'html':
            sanitized[key] = sanitizationUtils.sanitizeHtml(value);
            break;
          case 'text':
          default:
            sanitized[key] = sanitizationUtils.sanitizeText(value);
            break;
        }
      }
    }

    return sanitized;
  },
};

const sanitizeInput = (fieldMappings = {}) => {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      try {
        req.body = sanitizationUtils.sanitizeObject(req.body, fieldMappings);
      } catch (error) {
        console.error('Sanitization error:', error.message);
        return res.status(400).json({
          error: 'Données invalides: ' + error.message,
        });
      }
    }

    if (req.query && typeof req.query === 'object') {
      for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === 'string') {
          req.query[key] = sanitizationUtils.sanitizeText(value);
        }
      }
    }

    next();
  };
};

const escapeHelper = (text) => {
  if (!text || typeof text !== 'string') return text;
  return encode(text);
};

module.exports = {
  sanitizationUtils,
  sanitizeInput,
  escapeHelper,
};
