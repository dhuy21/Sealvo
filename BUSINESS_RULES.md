# Sealvo — Business Rules

Rules as implemented in the new stack (`apps/api`, `apps/web`). When this file and the code
disagree, the code wins: fix this file. File references are relative to `apps/api/src` unless noted.

## Timezone

- The whole app uses **Europe/Paris** (product decision). The API image sets `TZ=Europe/Paris`
  (`apps/api/Dockerfile`); API, Worker and Scheduler share that image.
- Every "day" below (due dates, streak, cleanup retention) is a calendar day in that zone, computed
  from the process local time (`learning/spaced-repetition.ts` `startOfToday`). Timestamps are
  stored as UTC instants by Prisma.
- The scheduler cron also runs in Europe/Paris (`scheduler.ts`).

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
  `date_memorized < today 00:00 + 1 day − interval` (`spaced-repetition.ts` `dueCutoff`). A word
  with a null `date_memorized` is never due.
- New words get `date_memorized = now` and level `x` (unless a level is given), so they are due
  the same day. `v` words are due again every 20 days: they appear in the review list, dashboard
  and reminders, but no game promotes them further.
- Due words are what the learn page (`GET /packages/:id/words/review`), the games, the dashboard
  "packages to review" (active packages only) and the reminder email use.

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
  accuracy ≥ 70 % and ≥ 5 words · Word Scramble: ≥ 80 % of the answers given · Phrase
  Completion: ≥ 80 % of all questions · Speed Vocab: ≥ 70 % of
  the words typed · Word Search: ≥ 70 % of the words found.
- Word Search: the API keeps the due words of ≤ 13 bytes and sends a random subset of at most
  **30**. The other games get every due word; the web builds and shuffles questions, cards and
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

`POST /learning/streak` is called when a learn session (flashcards) is finished
(`learning.service.ts` `checkAndUpdateStreak`):

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
  query, body) must be a positive integer (otherwise 400) and the same, otherwise 403.
- Creating a package as `public`, or switching it to `public`, **deactivates** it
  (`is_active = false`). Inactive packages are excluded from reminders and the dashboard review
  list; the owner can re-activate them (toggle).
- Copy (`POST /packages/:id/copy`, `public` only): new `private`, active package with the same name
  and description; every word detail is cloned (no shared rows) and restarts at level `x`, due today.
- Deleting a package deletes its learning rows and the word details no other package uses.

## Words

- The word pool is shared: a word is unique by `(word, subject, language_code)`; meaning,
  pronunciation, examples, etc. are per package (`word_details`). Editing a detail still shared
  with another package clones it first.
- Validation (`words/dto/create-word.dto.ts`): `word` and `subject` 1–255 chars, `meaning`
  1–2000, other text fields ≤ 2000 (pronunciation ≤ 255); `language_code` one of the 18 codes
  of `VALID_LANGS` (en-US, en-GB, fr-FR, es-ES, de-DE, it-IT, ja-JP, zh-CN, zh-HK, zh-TW, pt-PT,
  ru-RU, vi-VN, ko-KR, id-ID, hi-IN, pl-PL, nl-NL); `type` one of noun, verb, adjective, adverb,
  `ph_v` (stored and shown as `ph.v`), idiom, collocation; optional `level` one of `x`, `level_0`,
  `level_1`, `level_2`, `v` (`null` rejected). `ph.v` and `0` / `1` / `2` are the spreadsheet
  values (import).
- `POST /packages/:id/words` takes at most **500** words and rejects unknown properties. Adding
  **3 or more** words at once goes through the worker like an import when RabbitMQ and Redis are
  up; fewer words, or no queue (or a publish the broker does not confirm), are saved in the request
  (`import/bulk-words.service.ts`).
- With `GEMINI_API_KEY`, examples are rewritten so the target word is wrapped in `**word**`
  (needed by Phrase Completion) on add, import and edit. Failures never block saving.

## Excel import

`POST /packages/:id/import` (owner only; `import/import.service.ts`):

- `.xlsx` or `.xls` only, ≤ 5 MB, ≤ **500** word rows. An `.xlsx` whose zip entries declare more
  than **20 MB** uncompressed is rejected before parsing ("Le fichier est trop volumineux une fois
  décompressé.").
- Columns in order: word, language, subject, type, pronunciation, meaning, example, synonyms,
  antonyms, grammar, level. A first row whose first cell is exactly `Mot` or `Word` is a header and skipped;
  rows with an empty first cell are skipped; text in parentheses in the language cell is removed.
- All-or-nothing: if any row lacks word / meaning / subject or has an invalid language, type or
  level, nothing is imported and the 400 message lists the rows per error.
- Processed by the worker through RabbitMQ when RabbitMQ and Redis are available and the broker
  confirms the message (job status `GET /jobs/:id`, owner only, kept 1 h; the SSE stream
  `GET /jobs/:id/stream` ends when the job finishes or after that hour), otherwise synchronously in
  the request.
- A worker job is applied at most once: a redelivered job (worker crash after the commit) saves
  nothing again and reports the words of the first delivery (`applied_jobs`, kept 7 days).

## Accounts, email and sessions

| Item                | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registration        | username trimmed, 3–50 chars (same rules when changed later; also trimmed on login and resend-verification), unique; valid unique email (trimmed and normalized with validator.js `normalizeEmail` defaults, also on forgot-password and profile); username and email checked case-insensitively (DB collation: `john` = `John`); a taken username → 409; a taken email gets the same 201 answer as a new registration (no user enumeration) and nothing is created: the owner is emailed instead — a "your account already exists" message with login and forgot-password links (`mailAccountExists.hbs`) if verified, a new verification link otherwise; password ≥ 6 chars (bcrypt cost 12); avatar 1–11 (`null` rejected) |
| Email verification  | required before login; link token valid **3 h**, stored hashed, previous tokens revoked                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Resend verification | `POST /auth/resend-verification` `{username}`: a new link is sent only if the account exists and is not verified; the answer is always the same 200 message                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Access token        | JWT, **15 min**, payload `{sub, username, role}`, kept in memory by the web app                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Refresh session     | httpOnly cookie (`SameSite=Strict`, path `/auth`, `Secure` in production/staging); expires **7 days** after the last refresh; rotated on every refresh, the previous token stays valid **10 s** (a lost response; tabs refresh one at a time through Web Locks), replaying it later revokes the session; `POST /auth/login`, `register`, `refresh` and `logout` refuse a browser `Origin` other than the frontend's (403)                                                                                                                                                                                                                                                                                                     |
| Logout              | revokes the current device's session only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Password reset      | link token valid **1 h**, stored hashed in DB; a new request replaces the previous token; new password ≥ 8 chars; revokes every session of the user; `forgot-password` always answers the same message                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Email change        | needs the current password; the address changes only when the link sent to the new address (3 h) is opened                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Google login        | the Google email is normalized like on registration; an account matches on the normalized or the raw stored email, otherwise a verified account is created; an existing **unverified** account is verified, its password replaced and its sessions revoked                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Feedback            | type suggestion / bug / question / appreciation / other; subject (≤ 255 chars) and content (≤ 5000) trimmed and required; reply email optional                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

## Reminders and cleanup

The scheduler calls `POST /api/reminder` at **06:00, 12:00, 18:00 and 23:00** (Europe/Paris);
after a restart it catches up if the last run is older than 7 h (`scheduler.ts`). Each run:

- emails every user who has due words in an **active** package (count + preview of 5 words +
  streak). Each run sends its own email: a user with due words can receive up to 4 a day.
- `POST /reminder/test` (logged-in user, dashboard): the same email to the user's own address
  only, if they have due words in an active package (`reminder/test-reminder.controller.ts`).
- cleanup (`reminder/reminder.service.ts`): email verification tokens created ≥ 15 days ago and
  **never-verified accounts created ≥ 3 days ago** are deleted (calendar days:
  `DATE(created_at) + n <= today`), as well as expired refresh sessions and reset tokens, and
  import markers (`applied_jobs`) older than 7 days.
- Emails: a send that times out (10 s) is not retried and counts as sent, so an email is never
  sent twice but may be lost.

## Rate limits

Per client IP, stored in Redis (in-memory per instance if Redis is down), `@nestjs/throttler`; the limits below are the named policies of `common/throttler/throttle-policies.ts`, whose 429 message states the window computed from the limit itself.
A 429 carries the route's French message (`@ThrottleMessage`, e.g. "Trop de tentatives de
connexion. Réessayez dans 15 minutes."), default "Trop de requêtes. Réessayez dans 1 minute.":

| Route                                              | Limit                                                                                           |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| default (every route)                              | 100 / min                                                                                       |
| `POST /auth/register`                              | 5 / 15 min                                                                                      |
| `POST /auth/login`                                 | 10 / 15 min                                                                                     |
| `POST /auth/forgot-password`                       | 3 / h                                                                                           |
| `POST /auth/resend-verification`                   | 3 / h                                                                                           |
| `POST /auth/reset-password`                        | 10 / 15 min (own message: "Trop de tentatives de réinitialisation. Réessayez dans 15 minutes.") |
| `POST /feedback`                                   | 5 / h                                                                                           |
| `POST /api/reminder` (cron secret)                 | 3 / h                                                                                           |
| `POST /reminder/test`                              | 3 / h                                                                                           |
| `POST /tts/generate`                               | 30 / min (text 1–200 chars, `language` in `VALID_LANGS`)                                        |
| `GET /health`, `GET /health/deps`, `GET /jobs/:id` | not limited (`@SkipThrottle`)                                                                   |
