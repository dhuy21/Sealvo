USE web_db;
--
-- CREATE TABLE IF NOT EXISTS word_pronunciations (
SELECT w.word_id as id, w.word, wd.meaning, wd.type, wd.synonyms, wd.antonyms, wd.example, wd.grammar, wp.pronunciation, ln.level
FROM words w
JOIN word_details wd ON w.word_id = wd.word_id
JOIN word_pronunciations wp ON wd.detail_id = wp.detail_id
JOIN learning ln ON w.word_id = ln.word_id
WHERE ln.user_id = 'd079827'
ORDER BY w.word ASC;