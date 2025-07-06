/* This file is used to initialize the database for the period of development
Don't use it in production */

/* Insert 3 different users  */
INSERT INTO users (id, username, email, password, streak, last_login, created_at, updated_at, ava) VALUES ('95a916c', 'John Doe', 'john.doe@example.com', 'password123', 0, NULL, CURRENT_TIMESTAMP, NULL, 1);
INSERT INTO users (id, username, email, password, streak, last_login, created_at, updated_at, ava) VALUES ('95a916d', 'Jane Doe', 'jane.doe@example.com', 'password123', 0, NULL, CURRENT_TIMESTAMP, NULL, 2);
INSERT INTO users (id, username, email, password, streak, last_login, created_at, updated_at, ava) VALUES ('95a916e', 'John Smith', 'john.smith@example.com', 'password123', 0, NULL, CURRENT_TIMESTAMP, NULL, 3);

/* Insert 3 different packages for each user */
INSERT INTO packages (package_id, user_id, package_name, package_description, created_at, mode) VALUES (1, '95a916c', 'Package 1', 'Description 1', CURRENT_TIMESTAMP, 'private');
INSERT INTO packages (package_id, user_id, package_name, package_description, created_at, mode) VALUES (2, '95a916c', 'Package 2', 'Description 2', CURRENT_TIMESTAMP, 'private');
INSERT INTO packages (package_id, user_id, package_name, package_description, created_at, mode) VALUES (3, '95a916c', 'Package 3', 'Description 3', CURRENT_TIMESTAMP, 'private');
INSERT INTO packages (package_id, user_id, package_name, package_description, created_at, mode) VALUES (4, '95a916d', 'Package 4', 'Description 4', CURRENT_TIMESTAMP, 'private');
INSERT INTO packages (package_id, user_id, package_name, package_description, created_at, mode) VALUES (5, '95a916d', 'Package 5', 'Description 5', CURRENT_TIMESTAMP, 'private');
INSERT INTO packages (package_id, user_id, package_name, package_description, created_at, mode) VALUES (6, '95a916e', 'Package 6', 'Description 6', CURRENT_TIMESTAMP, 'private');


/* Insert 3 different words for each package */
INSERT INTO words (word_id, word, subject, language_code) VALUES (1, 'Word 1', 'Subject 1', 'en');
INSERT INTO words (word_id, word, subject, language_code) VALUES (2, 'Word 2', 'Subject 2', 'en');
INSERT INTO words (word_id, word, subject, language_code) VALUES (3, 'Word 3', 'Subject 3', 'en');
INSERT INTO words (word_id, word, subject, language_code) VALUES (4, 'Word 4', 'Subject 4', 'en');
INSERT INTO words (word_id, word, subject, language_code) VALUES (5, 'Word 5', 'Subject 5', 'en');
INSERT INTO words (word_id, word, subject, language_code) VALUES (6, 'Word 6', 'Subject 6', 'en');

/* Insert 3 different word_details for each word */
INSERT INTO word_details (detail_id, word_id, type, meaning, pronunciation, synonyms, antonyms, example, grammar) VALUES (1, 1, 'noun', 'Meaning 1', 'Pronunciation 1', 'Synonym 1', 'Antonym 1', 'Example 1', 'Grammar 1');
INSERT INTO word_details (detail_id, word_id, type, meaning, pronunciation, synonyms, antonyms, example, grammar) VALUES (2, 2, 'verb', 'Meaning 2', 'Pronunciation 2', 'Synonym 2', 'Antonym 2', 'Example 2', 'Grammar 2');
INSERT INTO word_details (detail_id, word_id, type, meaning, pronunciation, synonyms, antonyms, example, grammar) VALUES (3, 3, 'adjective', 'Meaning 3', 'Pronunciation 3', 'Synonym 3', 'Antonym 3', 'Example 3', 'Grammar 3');
INSERT INTO word_details (detail_id, word_id, type, meaning, pronunciation, synonyms, antonyms, example, grammar) VALUES (4, 4, 'adverb', 'Meaning 4', 'Pronunciation 4', 'Synonym 4', 'Antonym 4', 'Example 4', 'Grammar 4');
INSERT INTO word_details (detail_id, word_id, type, meaning, pronunciation, synonyms, antonyms, example, grammar) VALUES (5, 5, 'ph.v', 'Meaning 5', 'Pronunciation 5', 'Synonym 5', 'Antonym 5', 'Example 5', 'Grammar 5');
INSERT INTO word_details (detail_id, word_id, type, meaning, pronunciation, synonyms, antonyms, example, grammar) VALUES (6, 6, 'idiom', 'Meaning 6', 'Pronunciation 6', 'Synonym 6', 'Antonym 6', 'Example 6', 'Grammar 6');

/* Insert 3 different learning for each word_detail */
INSERT INTO learning (detail_id, package_id, level, date_memorized, date_stocked) VALUES (1, 4, 'x', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO learning (detail_id, package_id, level, date_memorized, date_stocked) VALUES (2, 2, '0', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO learning (detail_id, package_id, level, date_memorized, date_stocked) VALUES (2, 1, '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO learning (detail_id, package_id, level, date_memorized, date_stocked) VALUES (3, 3, '0', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO learning (detail_id, package_id, level, date_memorized, date_stocked) VALUES (3, 1, '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO learning (detail_id, package_id, level, date_memorized, date_stocked) VALUES (4, 4, '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO learning (detail_id, package_id, level, date_memorized, date_stocked) VALUES (5, 3, 'v', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO learning (detail_id, package_id, level, date_memorized, date_stocked) VALUES (6, 6, 'x', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);



