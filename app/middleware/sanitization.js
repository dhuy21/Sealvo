const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const { encode } = require('html-entities');
const validator = require('validator');

// Create DOMPurify instance
const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Sanitization functions
const sanitizationUtils = {
    // Clean HTML and scripts from input
    sanitizeHtml: (input) => {
        if (typeof input !== 'string') return input;
        return purify.sanitize(input, { 
            ALLOWED_TAGS: [], // No HTML tags allowed
            ALLOWED_ATTR: [] // No attributes allowed
        });
    },

    // Encode HTML entities
    encodeHtml: (input) => {
        if (typeof input !== 'string') return input;
        return encode(input);
    },

    // Sanitize username (alphanumeric, spaces, some special chars)
    sanitizeUsername: (username) => {
        if (!username || typeof username !== 'string') return '';
        
        // Remove any HTML/script tags
        let clean = purify.sanitize(username, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
        
        // Allow only safe characters for usernames
        clean = clean.replace(/[<>'"&\/\\]/g, '');
        
        // Trim and limit length
        return clean.trim().substring(0, 50);
    },

    // Sanitize email
    sanitizeEmail: (email) => {
        if (!email || typeof email !== 'string') return '';
        
        // Basic email sanitization
        let clean = email.toLowerCase().trim();
        
        // Validate email format
        if (!validator.isEmail(clean)) {
            throw new Error('Format d\'email invalide');
        }
        
        return clean;
    },

    // Sanitize text content (for words, meanings, etc.)
    sanitizeText: (text) => {
        if (!text || typeof text !== 'string') return '';
        
        // Remove scripts but allow some formatting
        let clean = purify.sanitize(text, { 
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong'], 
            ALLOWED_ATTR: [] 
        });
        
        // Remove dangerous characters
        clean = clean.replace(/[<>'"&]/g, (match) => {
            const entities = {
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
                '&': '&amp;'
            };
            return entities[match];
        });
        
        return clean.trim();
    },

    // Recursively sanitize object properties
    sanitizeObject: (obj, fields = {}) => {
        if (!obj || typeof obj !== 'object') return obj;
        
        const sanitized = { ...obj };
        
        for (const [key, value] of Object.entries(sanitized)) {
            if (typeof value === 'string') {
                // Apply specific sanitization based on field type
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
    }
};

// Middleware to sanitize request body
const sanitizeInput = (fieldMappings = {}) => {
    return (req, res, next) => {
        if (req.body && typeof req.body === 'object') {
            try {
                req.body = sanitizationUtils.sanitizeObject(req.body, fieldMappings);
                console.log('Input sanitized:', {
                    originalKeys: Object.keys(req.body),
                    sanitized: true
                });
            } catch (error) {
                console.error('Sanitization error:', error.message);
                return res.status(400).json({ 
                    error: 'Données invalides: ' + error.message 
                });
            }
        }
        
        // Also sanitize query parameters
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

// Handlebars helper for safe output
const escapeHelper = (text) => {
    if (!text || typeof text !== 'string') return text;
    return encode(text);
};

module.exports = {
    sanitizationUtils,
    sanitizeInput,
    escapeHelper
}; 