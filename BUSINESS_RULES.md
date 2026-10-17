# Sealvo — Business Rules

Rules as implemented in the new stack (`apps/api`, `apps/web`). When this file and the code
disagree, the code wins: fix this file. File references are relative to `apps/api/src` unless noted.

## Timezone

- The whole app uses **Europe/Paris** (product decision). The API image sets `TZ=Europe/Paris`
  (`apps/api/Dockerfile`); API, Worker and Scheduler share that image.
- Every "day" below (due dates, streak, cleanup retention) is a calendar day in that zone, computed
  from the process local time (`common/domain/spaced-repetition.ts` `startOfToday`). Timestamps are
  stored as UTC instants by Prisma.
- The scheduler cron also runs in Europe/Paris (`scheduler/scheduler.service.ts`).

## Levels and spaced repetition

| Level (DB value) | Interval | Games to complete for promotion      | Next level |
| ---------------- | -------- | ------------------------------------ | ---------- |
| `x` (new)        | 0 days   | Flash Match, Vocab Quiz, Test Pronun | `0`        |
| `0`              | 2 days   | Word Scramble, Phrase Completion     | `1`        |
| `1`              | 4 days   | Speed Vocab                          | `2`        |
| `2`              | 10 days  | Word Search                          | `v`        |
| `v` (memorized)  | 20 days  | — (no game, final level)             | —          |

Source: `@sealvo/shared` (`packages/shared/src/constants`: `LEVELS`, `LEVEL_INTERVALS`, `GAME_LEVEL`,
`LEVEL_GAMES`); `learning/learning.constants.ts` derives `NEXT_LEVEL` from `LEVELS`.

- A word is **due** when `DATE(date_memorized) + interval <= today`, i.e.
  `date_memorized < today 00:00 + 1 day − interval` (`spaced-repetition.ts` `dueCutoff`, built on
  `daysCutoff`, which the cleanup retention uses too). A word
  with a null `date_memorized` is never due.
- New words get `date_memorized = now` and level `x` (unless a level is given), so they are due
  the same day. `v` words are due again every 20 days: they appear in the review list, dashboard
  and reminders, but no game promotes them further.
- Due words are what the games, the dashboard "packages to review" (active packages only) and the
  reminder email use. `GET /packages/:id/words/review` returns every word of the package with a
  `dueToday` flag: the learn page shows the due words by default and offers an "all words" mode.

## Games and promotion

- Each game reads the **due words of its level** in one package (`GET /games/:type/data`,
  owner only). It is playable only if the package has at least **6 words** at that level
  for Flash Match, **5** for the other games, **and** at least that many are due today; otherwise
  the API returns a French `errorMessage` (`games/games.service.ts`). Vocab Quiz also needs
  **6** due words in the web app (6 options per question, `vocab-quiz/generate-questions.ts`).
- A game counts as "completed" (client-side: `PASS_RULES` in
  `apps/web/src/components/games/level-progress.ts`, measured by each game's `scoring.ts`):
  Flash Match: the game only ends when every pair is found (max 15 pairs, no time limit), so a
  finished game always counts · Vocab Quiz: ≥ 70 % correct · Test Pronun: average
  accuracy ≥ 70 % and ≥ 5 words (a game is **10 words**; each word is scored once, and skipping
  the last word ends the game) · Word Scramble: correct checks ≥ 80 % of the words moved past
  (old app rules: checking the same word again scores again, and the attempt is counted when
  moving to the next word, so the accuracy can exceed 100 %) · Phrase Completion: ≥ 80 % of all
  questions · Speed Vocab: ≥ 70 % of the words typed · Word Search: ≥ 70 % of the words found.
- Rounding: Word Scramble, Phrase Completion and Speed Vocab compare the **rounded** percentage
  (79.5 % passes an 80 % rule, `percentage` in `level-progress.ts`); Vocab Quiz, Word Search and
  Flash Match round the **required count up** instead (`reachesShare`). The time limits of each
  game are in its `scoring.ts`.
- Word Search: the minimum of 5 counts every due word, **before** the length filter; the API then
  keeps the due words of ≤ 13 bytes ("Aucun mot trouvé dans votre vocabulaire." when none is left)
  and sends a random subset of at most **30**. The grid uses A–Z only: accents are dropped (`café` → `CAFE`), other characters
  removed; a word left with fewer than 2 letters, or that does not fit, is not hidden, and the
  timer and score count only the hidden words (`word-search/grid.ts`). The other games get every due word; the web builds and shuffles questions, cards and
  phrases itself.
- `POST /learning/level-progress/track` records completed games **per user and per level**
  (not per package), in a Redis hash (`cache:lvlprog:h:<userId>`, one field per game; 3 h TTL
  reset on each recorded game; lost if Redis restarts or expires — accepted). When every game of
  a level is completed, all due words of that level **in the package of that last request** move
  to the next level with `date_memorized = now`, and the progress of that level is cleared. With
  concurrent completions only the request whose `HDEL` removes every field promotes, so the
  promotion runs once (`learning/learning.service.ts`). Without Redis no progress is kept between
  requests: only the single-game levels (`1`, `2`) can still be promoted.
- Scores: one best score and a play count per user and game (`user_best_scores`); a new score
  only replaces a lower one. Score range 0–1 000 000.

## Streak

`POST /learning/streak` is called once every card of a learn session (flashcards) is marked
"Appris", in either mode (`learning.service.ts` `checkAndUpdateStreak`):

- already recorded today → unchanged · last activity yesterday → `+1` · older (or never) → `1`.
- The write is a conditional `updateMany` (`streak_updated_at` null or before today): concurrent
  requests of the same day count once.
- A missed day is only detected at the next activity: the stored streak is not decreased in
  between, and the dashboard shows the stored value.

## Packages: modes and access

| Mode                | Listed in "public" | Read (package + words) | Copy               | Write (edit, delete, toggle, words, import, games, review) |
| ------------------- | ------------------ | ---------------------- | ------------------ | ---------------------------------------------------------- |
| `private` (default) | no                 | owner                  | no                 | owner                                                      |
| `protected`         | yes                | any logged-in user     | no                 | owner                                                      |
| `public`            | yes                | any logged-in user     | any logged-in user | owner                                                      |

- Enforced by `auth/guards/package-ownership.guard.ts` (owner only) and
  `package-read.guard.ts` (adds read for `public`/`protected`). The `Admin` role gives no extra
  rights (as in the old app; the specs assert it is rejected). Every package id sent (path,
  query, body) must be a positive integer (otherwise 400) and the same, otherwise 403; a package
  that does not exist is a 404.
- Package name and description are trimmed.
- Creating a package as `public`, or switching it to `public`, **deactivates** it
  (`is_active = false`). Inactive packages are excluded from reminders and the dashboard review
  list; the owner can re-activate them (toggle).
- Copy (`POST /packages/:id/copy`, `public` only): new `private`, active package with the same name
  and description; every word detail is cloned (no shared rows) and restarts at level `x`, due today.
- Deleting a package deletes its learning rows and the word details no other package uses.

## Words

- The word pool is shared: a word is unique by `(word, subject, language_code)`, case- and
  accent-sensitive (`utf8mb4_0900_as_cs`, migration 006: `Paris` ≠ `paris`, `résumé` ≠ `resume`); meaning,
  pronunciation, examples, etc. are per package (`word_details`). Editing a detail still shared
  with another package clones it first.
- Validation (`words/dto/create-word.dto.ts`): every text field is trimmed first (as in the old
  app: `Paris ` and `Paris` are the same word, a blank word is rejected); `word` and `subject`
  1–255 chars, `meaning`
  1–2000, other text fields ≤ 2000 (pronunciation ≤ 255); `language_code` one of the 18 codes
  of `VALID_LANGS` (en-US, en-GB, fr-FR, es-ES, de-DE, it-IT, ja-JP, zh-CN, zh-HK, zh-TW, pt-PT,
  ru-RU, vi-VN, ko-KR, id-ID, hi-IN, pl-PL, nl-NL); `type` one of noun, verb, adjective, adverb,
  `ph_v` (stored and shown as `ph.v`), idiom, collocation; optional `level` one of `x`, `level_0`,
  `level_1`, `level_2`, `v` (`null` rejected). `ph.v` and `0` / `1` / `2` are the spreadsheet
  values (import).
- `POST /packages/:id/words` takes at most **500** words and rejects unknown properties; its JSON
  body may reach **6 MB** (500 words at the longest fields), every other JSON body is limited to
  100 KB. Adding
  **3 or more** words at once goes through the worker like an import when RabbitMQ and Redis are
  up; fewer words, or no queue (or a publish the broker does not confirm), are saved in the request
  (`import/bulk-words.service.ts`).
- With `GEMINI_API_KEY`, missing examples are generated and existing ones rewritten so the
  target word is wrapped in `**word**` (needed by Phrase Completion) on add, import and edit, in
  batches of 25. Failures never block saving.
- Editing a word's level (`PATCH …/words/:detailId`) keeps its `date_memorized`.
- Leaving the add-words form with unsaved words, or a learn session where a card has been
  answered (the progress is not saved), asks for confirmation: reload and tab close show the
  browser dialog, in-app links a `confirm`. The browser back button is not covered.

## Excel import

`POST /packages/:id/import` (owner only; `import/import.service.ts`):

- `.xlsx` or `.xls` only, ≤ 5 MB, ≤ **500** word rows. An `.xlsx` whose zip entries declare more
  than **20 MB** uncompressed is rejected before parsing ("Le fichier est trop volumineux une fois
  décompressé.").
- Columns in order: word, language, subject, type, pronunciation, meaning, example, synonyms,
  antonyms, grammar, level. A first row whose first cell is exactly `Mot` or `Word` is a header and skipped;
  rows with an empty first cell are skipped; text in parentheses in the language cell is removed.
- All-or-nothing: if any row lacks word / meaning / subject, has an invalid language, type or
  level, or a field too long (word, subject, pronunciation ≤ 255; the other fields ≤ 2000),
  nothing is imported and the 400 message lists the rows per error. Rows are numbered by word
  (first word = 1), not by spreadsheet row: the header and blank rows are not counted.
- Parsing and validation run in the request even when the job is then queued, so an invalid file
  gets its 400 at once.
- Processed by the worker through RabbitMQ when RabbitMQ and Redis are available and the broker
  confirms the message (job status `GET /jobs/:id`, owner only, kept 1 h; the SSE stream
  `GET /jobs/:id/stream` ends when the job finishes or after that hour), otherwise synchronously in
  the request.
- A worker job is applied at most once: a redelivered job (worker crash after the commit) saves
  nothing again and reports the words of the first delivery (`applied_jobs`, kept 7 days). A
  failed worker import is retried once after 30 s, then marked failed.

## Accounts, email and sessions

| Item                | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registration        | username trimmed, 3–50 chars (same rules when changed later; also trimmed on login and resend-verification), unique; valid unique email (trimmed and normalized with validator.js `normalizeEmail` defaults, also on forgot-password and profile); username and email checked case-insensitively (DB collation: `john` = `John`); a taken username → 409; a taken email gets the same 201 answer as a new registration (no user enumeration) and nothing is created: the owner is emailed a "your account already exists" message with login and forgot-password links (`mailAccountExists.hbs`), verified or not — never a verification link, since whoever registered first knows the password; the email must also match the `users_email_format` CHECK; password ≥ 6 chars and ≤ 72 bytes (bcrypt cost 12); avatar 1–11 (`null` rejected) |
| Email verification  | required before login; link token valid **3 h**, stored hashed, previous tokens revoked                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Resend verification | `POST /auth/resend-verification` `{username}`: a new link is sent only if the account exists and is not verified; the answer is always the same 200 message                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Access token        | JWT, **15 min**, payload `{sub, username, role}`, kept in memory by the web app; not checked against the sessions, so it stays valid up to 15 min after a logout or a revoke                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Refresh session     | httpOnly cookie (`SameSite=Strict`, path `/auth`, `Secure` in production/staging); expires **7 days** after the last refresh and at most **30 days** after the login (then a new login is needed); rotated on every refresh, the previous token stays valid **10 s** (a lost response; tabs refresh one at a time through Web Locks), replaying it later revokes the session; `POST /auth/login`, `register`, `refresh` and `logout` refuse a browser `Origin` other than the frontend's (403)                                                                                                                                                                                                                                                                                                                                                |
| Logout              | revokes the current device's session only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Password reset      | link token valid **1 h**, stored hashed in DB; a new request replaces the previous token; new password ≥ 8 chars; verifies the email (the link reached the inbox); revokes every session of the user and the pending email-change links; `forgot-password` always answers the same message                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Email change        | needs the current password; the address changes only when the link sent to the new address (3 h) is opened; at most 3 requests per hour per account (429); an address already used → 409, at the request and again when the link is opened                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Google login        | the Google email is normalized like on registration; an account matches on the normalized or the raw stored email, otherwise a verified account is created; an existing **unverified** account is verified, its password replaced and its sessions revoked; a Google email that Google has not verified is refused (401). If both the normalized and the raw form of an email each have an account (possible only for accounts created before normalization), the normalized one is used and the other is not merged: production has no users, so this is kept as is                                                                                                                                                                                                                                                                          |
| Web app startup     | the web app restores the session with one refresh; when the API is unreachable (network error, 429 or 5xx) guarded pages keep showing a spinner (no redirect to `/login`) and it retries after 2, 5, 10 then every 30 s; only a refresh the API rejects (4xx other than 429) logs out                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Profile             | `PATCH /account/profile`: username, avatar, email (see Email change); the dashboard stats are cached **5 min** and the cache is cleared by every write that changes them                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Feedback            | type suggestion / bug / question / appreciation / other; subject (≤ 255 chars) and content (≤ 5000) trimmed and required; reply email optional                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

## Reminders and cleanup

The scheduler calls `POST /api/reminder` at **06:00, 12:00, 18:00 and 23:00** (Europe/Paris);
after a restart it catches up if the last run is older than 7 h (`scheduler/scheduler.service.ts`).
The last run is recorded only after a 2xx answer, and no catch-up happens when none is recorded
(first boot, or no Redis). Each run:

- emails every user who has due words in an **active** package (count + preview of 5 words +
  streak). Each run sends its own email: a user with due words can receive up to 4 a day. Only
  the first run of a given hour sends (`cache:reminder:run:<UTC hour>`, e.g.
  `cache:reminder:run:2026-10-17T12`, `SET NX`, 2 h TTL), so a catch-up and the scheduled run
  cannot both send. Without Redis every run sends.
- `POST /reminder/test` (logged-in user, dashboard): the same email to the user's own address
  only, if they have due words in an active package (`reminder/test-reminder.controller.ts`).
- cleanup (`maintenance/maintenance.service.ts`, each table on its own: one failure does not stop
  the others): email verification tokens created ≥ 15 days ago and
  **never-verified accounts created ≥ 3 days ago** are deleted (calendar days:
  `DATE(created_at) + n <= today`), as well as expired refresh sessions and reset tokens, and
  import markers (`applied_jobs`) older than 7 days.
- Emails: a send that times out (10 s) is not retried and counts as sent, so it may be lost. A
  worker stopping right after SES accepted an email can, rarely, send it twice. A queued email
  that fails is retried twice, 10 s apart, then moved to the failed queue.

## Rate limits

Per client IP, stored in Redis (in-memory per instance if Redis is down), `@nestjs/throttler`; the limits below are the named policies of `common/throttler/throttle-policies.ts`, whose 429 message states the window computed from the limit itself.
A 429 carries the route's French message (`@ThrottleMessage`, e.g. "Trop de tentatives de
connexion. Réessayez dans 15 minutes."), default "Trop de requêtes. Réessayez dans 1 minute.":

| Route                              | Limit                                                                                           |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| default (every route)              | 100 / min                                                                                       |
| `POST /auth/register`              | 5 / 15 min                                                                                      |
| `POST /auth/login`                 | 10 / 15 min                                                                                     |
| `POST /auth/forgot-password`       | 3 / h                                                                                           |
| `POST /auth/resend-verification`   | 3 / h                                                                                           |
| `POST /auth/reset-password`        | 10 / 15 min (own message: "Trop de tentatives de réinitialisation. Réessayez dans 15 minutes.") |
| `PATCH /account/profile`           | 10 / 15 min (checks the current password for an email change)                                   |
| `POST /packages/:id/copy`          | 20 / h (each copy duplicates every word)                                                        |
| `POST /feedback`                   | 5 / h                                                                                           |
| `POST /api/reminder` (cron secret) | 3 / h                                                                                           |
| `POST /reminder/test`              | 3 / h                                                                                           |
| `POST /tts/generate`               | 30 / min (text 1–500 chars after trimming, `language` in `VALID_LANGS`)                         |
| `GET /health`, `GET /jobs/:id`     | not limited (`@SkipThrottle`); `GET /health/deps` has the default limit                         |

Limits outside the throttler (429 as well): **3 email-change requests per hour per account**, and
at most **10 open job progress streams** (`GET /jobs/:id/stream`) per user.
