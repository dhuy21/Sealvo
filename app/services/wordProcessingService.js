const geminiService = require('./gemini');
const wordModel = require('../models/words');
const cache = require('../core/cache');

const GEMINI_BATCH_SIZE = 25;

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function enrichWithGemini(words) {
  const wordsNoExample = [];
  const wordsWithExample = [];

  for (const word of words) {
    if (!word.meaning || !word.type || !word.word) continue;
    if (word.example === '') {
      wordsNoExample.push({
        id: word.id,
        word: word.word,
        language_code: word.language_code,
        meaning: word.meaning,
        type: word.type,
      });
    } else {
      wordsWithExample.push({
        id: word.id,
        word: word.word,
        language_code: word.language_code,
        meaning: word.meaning,
        type: word.type,
        example: word.example,
      });
    }
  }

  if (wordsNoExample.length > 0) {
    const batches = chunk(wordsNoExample, GEMINI_BATCH_SIZE);
    for (const batch of batches) {
      try {
        const generated = await geminiService.generateExemple(batch);
        if (Array.isArray(generated) && generated.length > 0) {
          words = await geminiService.replaceExample(words, generated);
        }
      } catch (err) {
        console.warn(
          `[wordProcessing] Gemini generateExemple error (batch ${batches.indexOf(batch) + 1}/${batches.length}):`,
          err.message
        );
      }
    }
  }

  if (wordsWithExample.length > 0) {
    const batches = chunk(wordsWithExample, GEMINI_BATCH_SIZE);
    for (const batch of batches) {
      try {
        const corrected = await geminiService.modifyExample(batch);
        if (Array.isArray(corrected) && corrected.length > 0) {
          words = await geminiService.replaceExample(words, corrected);
        }
      } catch (err) {
        console.warn(
          `[wordProcessing] Gemini modifyExample error (batch ${batches.indexOf(batch) + 1}/${batches.length}):`,
          err.message
        );
      }
    }
  }

  return words;
}

async function enrichSingleWord(wordData) {
  if (!wordData.meaning || !wordData.type || !wordData.word) return wordData;

  const payload = {
    id: wordData.id,
    word: wordData.word,
    language_code: wordData.language_code,
    meaning: wordData.meaning,
    type: wordData.type,
  };

  if (wordData.example === '') {
    try {
      const generated = await geminiService.generateExemple([payload]);
      if (Array.isArray(generated) && generated.length > 0) {
        wordData.example = generated[0].example;
      }
    } catch (err) {
      console.warn('[wordProcessing] Gemini generateExemple error:', err.message);
    }
  } else {
    try {
      const corrected = await geminiService.modifyExample([
        { ...payload, example: wordData.example },
      ]);
      if (Array.isArray(corrected) && corrected.length > 0) {
        wordData.example = corrected[0].example;
      }
    } catch (err) {
      console.warn('[wordProcessing] Gemini modifyExample error:', err.message);
    }
  }

  return wordData;
}

const VALID_TYPES = ['noun', 'verb', 'adjective', 'adverb', 'ph.v', 'idiom', 'collocation'];
const VALID_LEVELS = ['x', '0', '1', '2', 'v'];
const VALID_LANGS = [
  'en-US',
  'en-GB',
  'fr-FR',
  'es-ES',
  'de-DE',
  'it-IT',
  'ja-JP',
  'zh-CN',
  'zh-HK',
  'zh-TW',
  'pt-PT',
  'ru-RU',
  'vi-VN',
  'ko-KR',
  'id-ID',
  'hi-IN',
  'pl-PL',
  'nl-NL',
];

function validateWords(words) {
  const errors = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const row = i + 1;
    const label = w.word || `(ligne ${row})`;
    if (!w.word) errors.push({ row, word: label, field: 'word', value: w.word });
    if (!w.meaning) errors.push({ row, word: label, field: 'meaning', value: w.meaning });
    if (!w.subject) errors.push({ row, word: label, field: 'subject', value: w.subject });
    if (!w.language_code || !VALID_LANGS.includes(w.language_code)) {
      errors.push({ row, word: label, field: 'language_code', value: w.language_code });
    }
    if (!w.type || !VALID_TYPES.includes(w.type)) {
      errors.push({ row, word: label, field: 'type', value: w.type });
    }
    if (w.level != null && w.level !== '' && !VALID_LEVELS.includes(String(w.level))) {
      errors.push({ row, word: label, field: 'level', value: w.level });
    }
  }
  return errors;
}

const FIELD_INFO = {
  word: { label: 'Mot manquant' },
  meaning: { label: 'Signification manquante' },
  subject: { label: 'Sujet manquant' },
  language_code: { label: 'Langue invalide', accepted: VALID_LANGS },
  type: { label: 'Type invalide', accepted: VALID_TYPES },
  level: { label: 'Niveau invalide', accepted: VALID_LEVELS },
};

function formatValidationErrors(errors) {
  const grouped = {};
  for (const e of errors) {
    if (!grouped[e.field]) grouped[e.field] = [];
    grouped[e.field].push(e.row);
  }

  const lines = [];
  for (const [field, rows] of Object.entries(grouped)) {
    const info = FIELD_INFO[field] || { label: field };
    let line = `${info.label} (${rows.length}) : lignes ${rows.join(', ')}`;
    if (info.accepted) line += `\nAcceptés : ${info.accepted.join(', ')}`;
    lines.push(line);
  }
  return lines.join('\n');
}

function isValidWord(w) {
  return w.word && w.language_code && w.subject && w.type && w.meaning;
}

async function saveWords(words, packageId, { onProgress } = {}) {
  let successCount = 0;
  let errChamps = 0;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (!isValidWord(w)) {
      errChamps++;
      continue;
    }
    if (w.level == null || w.level === '') w.level = 'x';
    try {
      await wordModel.create(w, packageId);
      successCount++;
    } catch {
      errChamps++;
    }
    if (onProgress) onProgress(i + 1, words.length);
  }

  return { successCount, errChamps };
}

async function processWords(words, packageId, userId, { onProgress, onPhase } = {}) {
  if (onPhase) await onPhase('gemini', 0, words.length);
  const enriched = await enrichWithGemini(words);

  if (onPhase) await onPhase('saving', 0, enriched.length);
  const result = await saveWords(enriched, packageId, { onProgress });

  if (result.successCount > 0) {
    await cache.del([`dashboard:${userId}`, `words:${packageId}`]);
  }

  return result;
}

module.exports = {
  validateWords,
  formatValidationErrors,
  enrichWithGemini,
  enrichSingleWord,
  saveWords,
  processWords,
  VALID_LANGS,
  VALID_TYPES,
  VALID_LEVELS,
};
