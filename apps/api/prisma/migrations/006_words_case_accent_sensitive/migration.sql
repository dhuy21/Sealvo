-- The (word, subject, language_code) unique key used the table's case- and accent-insensitive
-- collation: adding "Paris" or "résumé" reused the "paris" / "resume" row, so the user saw the
-- other spelling and an edit that only changed accents or case did nothing.
-- utf8mb4_0900_as_cs tells those apart and still sorts alphabetically. It is NO PAD, but every
-- input is trimmed. Fails on rows it would merge; find them first with the SELECT in
-- docs/railway-setup.md.
ALTER TABLE `words`
  MODIFY `word` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  MODIFY `subject` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL;
