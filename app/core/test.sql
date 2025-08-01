/* Test the database */
/* Count the number total of words  of a user */
/*SELECT COUNT(*) as count 
FROM learning l
JOIN word_details wd ON l.detail_id = wd.detail_id
JOIN words w ON wd.word_id = w.word_id
JOIN packages p ON l.package_id = p.package_id
WHERE p.user_id = '95a916c';*/

INSERT INTO words (word, language_code, subject)
VALUES ('Word 1', 'en', 'Subject 1')
ON DUPLICATE KEY UPDATE
  subject = 'Subject 1' -- “làm mới” bản ghi để kích hoạt UPDATE
RETURNING word_id;

