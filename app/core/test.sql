/* Test the database */
/* Count the number total of words  of a user */
SELECT COUNT(*) as count 
FROM learning l
JOIN word_details wd ON l.detail_id = wd.detail_id
JOIN words w ON wd.word_id = w.word_id
JOIN packages p ON l.package_id = p.package_id
WHERE p.user_id = '95a916c';

