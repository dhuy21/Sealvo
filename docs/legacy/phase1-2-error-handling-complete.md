# API Design & Error Handling Patterns — Phase 1 + Phase 2

> **Skill** : 5. API Design & Error Handling Patterns  
> **État final** : Phase 1 + Phase 2 terminées et validées — **38 suites, 393 tests passent**

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture centralisée](#2-architecture-centralisée)
3. [Infrastructure créée (Phase 1)](#3-infrastructure-créée-phase-1)
4. [Phase 1 — Refactoring des controllers métier](#4-phase-1--refactoring-des-controllers-métier)
5. [Phase 2 — Uniformisation complète](#5-phase-2--uniformisation-complète)
6. [Bugs découverts et corrigés](#6-bugs-découverts-et-corrigés)
7. [Tests](#7-tests)
8. [Concepts clés](#8-concepts-clés)
9. [Arborescence finale](#9-arborescence-finale)
10. [Phases suivantes](#10-phases-suivantes)

---

## 1. Vue d'ensemble

### Le problème initial

Avant ces deux phases, chaque controller gérait ses erreurs localement :

```javascript
// AVANT — Code dupliqué dans ~30 controllers
async deleteWord(req, res) {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Vous devez être connecté' });
    }
    const word = await wordModel.findUsersByWordId(id);
    if (!word) {
      return res.status(404).json({ error: 'Mot non trouvé' });
    }
    // ...
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
```

**Problèmes** :
- Code dupliqué (DRY violé) — mêmes try/catch partout
- Format incohérent — `{ error: "..." }` vs `{ success: false, message: "..." }`
- Erreurs masquées — le catch(500) cache la vraie cause de l'erreur
- Auth redondante — `if (!req.session.user)` alors qu'un middleware existe
- Non maintenable — changer le format d'erreur = modifier ~30 fichiers

### La solution

```javascript
// APRÈS — Controller propre, focalisé sur la logique métier
async deleteWord(req, res) {
  const word = await wordModel.findUsersByWordId(id);
  if (!word) throw new NotFoundError('Mot non trouvé');
  // ...
  res.json({ success: true, message: 'Mot supprimé avec succès' });
}
```

L'infrastructure centralisée (`asyncHandler` → `errorHandler`) s'occupe de tout le reste.

---

## 2. Architecture centralisée

```
Requête HTTP
    │
    ▼
┌──────────────────┐
│   auth middleware │  ← isAuthenticated / isAuthenticatedAPI
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│     Routes       │  ← asyncHandler(controller.method)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   Controller     │  ← throw new NotFoundError('...')
└────────┬─────────┘
         │ (Promise rejetée)
         ▼
┌──────────────────┐
│  asyncHandler    │  ← Promise.resolve(fn()).catch(next)
└────────┬─────────┘
         │ next(err)
         ▼
┌──────────────────┐
│  errorHandler    │  ← (err, req, res, next)
└────────┬─────────┘
         │
         ├─── expectsJson? → res.status(xxx).json({ success: false, message })
         │
         └─── Navigateur? → res.status(xxx).render('error', { ... })
```

**Ordre d'enregistrement dans `appFactory.js`** (crucial) :
```javascript
route(app);               // 1. Toutes les routes
app.use(notFoundHandler); // 2. Catch-all 404
app.use(errorHandler);    // 3. Gestionnaire d'erreurs central
```

---

## 3. Infrastructure créée (Phase 1)

### 3.1 — Hiérarchie d'erreurs : `src/app/errors/AppError.js`

| Classe | Code HTTP | Cas d'utilisation |
|---|---|---|
| `AppError` (base) | configurable | Classe mère abstraite |
| `ValidationError` | 400 | Données invalides, champs manquants |
| `UnauthorizedError` | 401 | Utilisateur non connecté |
| `ForbiddenError` | 403 | Accès refusé (pas propriétaire) |
| `NotFoundError` | 404 | Ressource inexistante |
| `ConflictError` | 409 | Conflit de données |

Chaque erreur porte :
- `statusCode` — code HTTP automatique
- `isOperational = true` — distingue erreurs métier des bugs
- `details` — optionnel, pour validation détaillée
- `name` — nom de la classe (pour `instanceof`)

### 3.2 — `src/app/middleware/asyncHandler.js`

```javascript
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

Express ne gère pas les rejections de Promise. Ce wrapper attrape toute erreur (throw ou await rejeté) et la passe à `next(err)` pour la router vers `errorHandler`.

### 3.3 — `src/app/middleware/errorHandler.js`

Deux composants :

**`expectsJson(req)`** — 5 heuristiques :
1. Path `/api/` → JSON
2. `req.xhr` → JSON
3. `Accept: application/json` → JSON
4. `Content-Type: application/json` → JSON
5. Méthode non-GET sans `Accept: text/html` (fetch POST) → JSON

**`errorHandler(err, req, res, next)`** :
- Erreur **opérationnelle** → code HTTP + message réel
- Erreur **non-opérationnelle** → 500 + message générique + console.error
- Development → stack trace inclus
- Production → stack trace caché
- `res.headersSent` → délègue à Express

### 3.4 — `src/app/middleware/notFoundHandler.js`

```javascript
function notFoundHandler(req, res, next) {
  next(new NotFoundError(`La route ${req.method} ${req.originalUrl} n'existe pas`));
}
```

### 3.5 — `src/app/middleware/auth.js` — Format standardisé

```javascript
const isAuthenticatedAPI = (req, res, next) => {
  if (req.session && req.session.user) return next();
  res.status(401).json({ success: false, message: 'Vous devez être connecté' });
};
```

---

## 4. Phase 1 — Refactoring des controllers métier

### Controllers refactorisés (10 controllers, ~30 méthodes)

| Controller | Méthodes | Erreurs utilisées |
|---|---|---|
| `WordController` | `deleteWord`, `editWordPost`, `addWordPost`, `deleteAllWords` | `NotFoundError`, `ForbiddenError`, `ValidationError` |
| `LearningController` | `checkAndUpdateStreak` | `UnauthorizedError` |
| `LevelProgressController` | `trackGameCompletion`, `resetLevelProgress` | `ValidationError` |
| `TTSController` | `generateAudio` | `ValidationError` |
| `JobController` | `getJob`, `getActiveJobs` | `NotFoundError`, `ForbiddenError` |
| `ResetPasswordController` | `forgotPasswordPost`, `resetPasswordPost` | `ValidationError`, `AppError` |
| `SiteController` | `feedbackPost` | `ValidationError` |
| `ReminderController` | `reminder`, `testEmail` | `ValidationError` |
| `PackageController` | 5 méthodes POST | `NotFoundError`, `ForbiddenError`, `ValidationError` |
| `UserController` | `editPost`, `changePasswordPost` | `ValidationError` |

### Routes : 49/50 protégées par `asyncHandler`

La seule exception à l'époque : `POST /monVocabs/add/import` (callback multer). Corrigé en Phase 2.

### Controllers NON refactorisés (intentionnel)

**Dégradation gracieuse (HTML)** — gardent un try/catch pour re-rendre la page avec un message contextuel :
- `WordController.monVocabs` — re-rend monVocabs avec `error: "..."`
- `PackageController.myPackages` — re-rend myPackages avec `error: "..."`
- `UserController.dashboard/logout` — redirige vers /login avec flash
- `GoogleAuthController.handleCallback` — redirige avec flash

**Game controllers** — candidats pour Phase 2 (voir section suivante).

---

## 5. Phase 2 — Uniformisation complète

### 5.1 — Objectif

Éliminer les dernières incohérences :
1. **Game controllers** : supprimer les try/catch et checks auth redondants
2. **Format de réponse** : éradiquer `{ error: "..." }` → `{ success: false, message: "..." }` partout
3. **importFile.importWords** : transformer le callback multer en middleware séparé + async function

### 5.2 — Game controllers refactorisés (8 controllers)

| Controller | Changements | Erreurs ajoutées |
|---|---|---|
| `GameController.saveScore` | Supprimé try/catch + auth check | `throw ValidationError` pour game_type invalide |
| `GameController.index` | Supprimé try/catch | DB errors propagent |
| `GameController.showGame` | Supprimé outer try/catch | `throw ValidationError` pour game type invalide |
| `WordScrambleController` | Supprimé try/catch + auth check | DB errors propagent |
| `SpeedVocabController` | Supprimé try/catch + auth check | DB errors propagent |
| `FlashMatchController` | Supprimé try/catch + auth check | `throw NotFoundError` si < 4 mots |
| `VocabQuizController` | Supprimé try/catch + auth check | `throw NotFoundError` si < 6 mots |
| `PhraseCompletionController` | Supprimé try/catch + auth check | DB errors propagent |
| `TestPronunController` | Supprimé try/catch + auth check | DB errors propagent |

**Exception intentionnelle** : `GameController.showGame` conserve un try/catch **interne** (lignes 74-79) pour le comptage de mots. Si le comptage échoue, la page se rend quand même avec `wordCount: 0` au lieu d'afficher une page d'erreur. C'est de la **dégradation gracieuse**.

### 5.3 — Refactoring `importFile.js`

**Avant** : une seule fonction callback qui gérait multer + parsing + validation + nettoyage.

**Après** : séparation en deux composants :

```javascript
// uploadMiddleware — gère multer, convertit ses erreurs en ValidationError
function uploadMiddleware(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof ValidationError) return next(err);
      return next(new ValidationError(err.message));
    }
    next();
  });
}

// importWords — fonction async propre, throw pour chaque erreur
async function importWords(req, res) {
  if (!req.file) throw new ValidationError("Aucun fichier n'a été téléchargé");

  let words;
  try {
    words = parseExcelFile(filePath);
  } finally {
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
  }

  if (words.length === 0) throw new ValidationError('Le fichier ne contient aucun mot valide.');
  // ... validation, rabbitmq, processWords
}
```

**Route mise à jour** :
```javascript
// Avant : router.post('/add/import', isAuthenticated, importFile.importWords);
// Après :
router.post('/add/import', isAuthenticated, uploadMiddleware, asyncHandler(importWords));
```

Résultat : **50/50 routes async protégées par `asyncHandler`**.

### 5.4 — Corrections frontend (9 fichiers JS)

La Phase 2 a changé le format d'erreur côté backend : `{ error: "..." }` → `{ success: false, message: "..." }`. Mais le frontend vérifiait encore `data.error`. C'était une **régression critique** — les erreurs n'étaient plus détectées, causant des crashes JavaScript.

**Pattern corrigé** :

```javascript
// AVANT — ne détecte plus les erreurs après Phase 2
.then((response) => response.json())
.then((data) => {
  if (data.error) { ... }  // data.error est toujours undefined maintenant !

// APRÈS — standard HTTP professionnel
.then((response) => {
  if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
  return response.json();
})
.then((data) => { ... })
```

| Fichier | Fix | Pattern |
|---|---|---|
| `speedVocab.js` | Ajout `response.ok` check | `.then()` chain |
| `vocabQuiz.js` (available-words) | Ajout `response.ok` check | `.then()` chain |
| `vocabQuiz.js` (questions) | `response.ok` + affichage `data.message` | `.then(async)` — récupère le message serveur |
| `phraseCompletion.js` (available-words) | Ajout `response.ok` check | `async/await` |
| `phraseCompletion.js` (phrases) | Ajout `response.ok` check + `isLoadingPhrase` | `async/await` |
| `testPronun.js` | Ajout `response.ok` check + alert | `async/await` |
| `wordSearch.js` (load words) | Ajout headers JSON + `response.ok` | `async/await` |
| `wordSearch.js` (save score) | `data.error` → `data.message` pour le message | Pattern existant |
| `vocabs.js` (deleteWord) | `response.ok` + `data.success === false` | `.then()` chain |
| `wordScramble.js` | Supprimé `if (data.error)` dead code | Nettoyage |
| `flashMatch.js` | Supprimé `if (data.error)` dead code | Nettoyage |

### 5.5 — Bug pré-existant corrigé : wordSearch saveScore

**Découvert pendant l'audit Phase 2** : `wordSearch.js` appelait `POST /games/wordSearch/saveScore` — **une route qui n'a jamais existé**. Les 6 autres jeux utilisaient correctement `POST /games/score`. Les scores du jeu wordSearch n'étaient **jamais sauvegardés**.

**Fix** :
```javascript
// AVANT — route inexistante, body incomplet
fetch('/games/wordSearch/saveScore', {
  body: JSON.stringify({ score }),
});

// APRÈS — route correcte, body complet (même pattern que les 6 autres jeux)
fetch('/games/score', {
  body: JSON.stringify({
    game_type: 'word_search',
    score: totalScore,
    details: {
      words_found: foundWords.length,
      total_words: words.length,
      accuracy: attempts > 0 ? Math.round((foundWords.length / attempts) * 100) : 0,
      attempts: attempts,
    },
  }),
});
```

### 5.6 — Bug wordSearch headers manquants

`wordSearch.js` était le seul jeu à faire un `fetch()` **sans aucun header**. Conséquence : `expectsJson()` retournait `false` → `errorHandler` renvoyait du HTML au lieu de JSON → `response.json()` crashait.

**Fix** : ajout de `Content-Type: application/json` (même pattern que tous les autres jeux).

---

## 6. Bugs découverts et corrigés (Phase 1 + Phase 2)

### Phase 1 — 5 bugs trouvés en 4 audits

| # | Bug | Sévérité | Fichier | Fix |
|---|---|---|---|---|
| 1 | `error: {}` dans template HTML → section vide en prod | Moyenne | `errorHandler.js` | `err.stack` en dev, `null` en prod |
| 2 | `streamJob` sans `asyncHandler` → rejection non attrapée | Haute | `routes/api.js` | Ajout `asyncHandler` |
| 3 | `GameController` même bug `error: {}` | Moyenne | `GameController.js` | Même fix que #1 |
| 4 | `expectsJson()` ne détectait pas `fetch()` → HTML au lieu de JSON | Critique | `errorHandler.js` | Ajout heuristiques Content-Type + non-GET |
| 5 | Import path incorrect `NotFoundError` | Basse | `WordSearchController.js` | Correction chemin |

### Phase 2 — 4 bugs trouvés en 3 audits

| # | Bug | Sévérité | Fichier(s) | Fix |
|---|---|---|---|---|
| 6 | Frontend `data.error` → `undefined` après changement format | Critique | 9 fichiers JS | `response.ok` check HTTP standard |
| 7 | `vocabs.js` deleteWord → échec silencieux | Haute | `vocabs.js` | `response.ok` + `data.success === false` |
| 8 | `wordSearch.js` saveScore → route inexistante `/games/wordSearch/saveScore` | Critique | `wordSearch.js` | URL `/games/score` + body complet |
| 9 | `wordSearch.js` fetch sans headers JSON → HTML en erreur | Haute | `wordSearch.js` | Ajout `Content-Type: application/json` |

---

## 7. Tests

### État final : **38 suites, 393 tests, tous passent**

### 7.1 — Tests infrastructure (Phase 1) — 39 tests

| Fichier | Tests | Couverture |
|---|---|---|
| `appError.test.js` | 13 | Hiérarchie complète, statusCode, instanceof, details, stack |
| `asyncHandler.test.js` | 5 | Resolve, reject, sync throw, forwarding args |
| `errorHandler.test.js` | 19 | 7 cas expectsJson, branche JSON (6 cas + stack dev/prod), branche HTML (3 cas), headersSent |
| `notFoundHandler.test.js` | 2 | Instance NotFoundError, message avec méthode + URL |

### 7.2 — Tests existants corrigés (Phase 1) — 28 tests adaptés

Le refactoring a changé le pattern : les controllers `throw` au lieu de `res.status().json()`. Les assertions passent de `expect(res.status).toHaveBeenCalledWith(...)` à `await expect(...).rejects.toThrow(ErrorClass)`.

| Fichier | Tests corrigés |
|---|---|
| `wordController.test.js` | 8 |
| `learningController.test.js` | 2 |
| `levelProgressController.test.js` | 4 |
| `resetPassword.test.js` | 6 |
| `ttsController.test.js` | 4 |
| `jobController.test.js` | 3 |
| `asyncHandler.test.js` | 1 |

### 7.3 — Tests Phase 2 (NOUVEAUX) — 33 tests

| Fichier | Tests | Ce qu'il vérifie |
|---|---|---|
| **`gameControllerErrors.test.js`** | 8 | saveScore: ValidationError pour game_type invalide, DB propagation, succès. showGame: ValidationError pour game invalide, graceful degradation word count. index: DB propagation, succès. |
| **`gameApiErrors.test.js`** | 15 | FlashMatch: NotFoundError si < 4 mots, boundary 4 mots, DB propagation. VocabQuiz: NotFoundError si < 6 mots, boundary 6 mots, available-words succès et DB. WordSearch: NotFoundError 0 mots et null, DB propagation. Tous les 5 controllers restants: DB error propagation. |
| **`importFile.test.js`** | 10 | uploadMiddleware: succès, passthrough ValidationError, conversion multer→ValidationError. importWords: missing file, empty words, validation fail, file cleanup try/finally, sync success, async success (rabbitmq), fallback sync quand publish échoue. |

### Détail des tests Phase 2

**`gameControllerErrors.test.js`** — GameController error paths :
```
✓ saveScore — throws ValidationError for invalid game_type
✓ saveScore — throws ValidationError with descriptive message
✓ saveScore — propagates DB error (no try/catch masking)
✓ saveScore — returns success with valid game_type
✓ showGame — throws ValidationError for unknown game type
✓ showGame — still renders when word counting fails (graceful degradation)
✓ index — propagates DB error (no try/catch masking)
✓ index — renders game index on success
```

**`gameApiErrors.test.js`** — Tous les game API controllers :
```
FlashMatchController:
  ✓ throws NotFoundError when fewer than 4 words available
  ✓ succeeds with exactly 4 words (minimum)
  ✓ propagates DB error

VocabQuizController:
  ✓ throws NotFoundError when fewer than 6 words available
  ✓ succeeds with exactly 6 words
  ✓ getAvailableWordsCount returns count
  ✓ getAvailableWordsCount propagates DB error

WordSearchController:
  ✓ throws NotFoundError when no words found
  ✓ throws NotFoundError when result is null
  ✓ propagates DB error

DB error propagation (try/catch removed):
  ✓ SpeedVocabController propagates DB error
  ✓ WordScrambleController propagates DB error
  ✓ TestPronunController propagates DB error
  ✓ PhraseCompletionController.getPhrasesForCompletion propagates DB error
  ✓ PhraseCompletionController.getAvailableWordsCount propagates DB error
```

**`importFile.test.js`** — uploadMiddleware + importWords :
```
uploadMiddleware:
  ✓ calls next() on successful upload
  ✓ passes through ValidationError from fileFilter
  ✓ converts generic multer error to ValidationError

importWords:
  ✓ throws ValidationError when req.file is missing
  ✓ throws ValidationError when parsed words are empty
  ✓ throws ValidationError when word validation fails
  ✓ cleans up temp file even when parsing throws
  ✓ succeeds with sync processing when rabbitmq is not ready
  ✓ succeeds with async processing when rabbitmq is ready
  ✓ falls back to sync when publish fails
```

---

## 8. Concepts clés

### 8.1 — Erreur opérationnelle vs erreur de programmation

| Type | Exemple | `instanceof AppError` | Réponse client |
|---|---|---|---|
| **Opérationnelle** | Mot non trouvé, champ manquant, accès refusé | `true` | Message réel de l'erreur |
| **Programmation** | Bug JS, crash DB, TypeError | `false` | "Une erreur interne est survenue" |

Les erreurs opérationnelles sont **attendues** et **sûres** à montrer.
Les erreurs de programmation sont des **bugs** — loguées en console, détails cachés au client.

### 8.2 — Séparation des responsabilités

| Composant | Responsabilité unique |
|---|---|
| `AppError` + sous-classes | Définir le vocabulaire d'erreurs (quoi) |
| Controller | Logique métier + `throw` (quand) |
| `asyncHandler` | Attraper les rejections async (transport) |
| `errorHandler` | Formater la réponse (comment) |
| `notFoundHandler` | Détecter les routes inexistantes |
| `expectsJson` | Détecter le format attendu (JSON vs HTML) |
| `isAuthenticatedAPI` | Vérifier l'auth avant le controller |

### 8.3 — Format de réponse standardisé

```json
// Succès
{ "success": true, "message": "Mot supprimé avec succès" }

// Erreur opérationnelle
{ "success": false, "message": "Mot non trouvé" }

// Erreur opérationnelle avec détails
{ "success": false, "message": "Données invalides", "details": [...] }

// Erreur non-opérationnelle (development)
{ "success": false, "message": "Une erreur interne est survenue...", "stack": "..." }

// Erreur non-opérationnelle (production)
{ "success": false, "message": "Une erreur interne est survenue..." }
```

### 8.4 — Dégradation gracieuse (HTML)

Certains controllers HTML gardent intentionnellement un try/catch pour afficher un message d'erreur **en contexte** au lieu de la page d'erreur générique :

```javascript
// monVocabs — re-rend la page avec un message d'erreur inline
catch (err) {
  res.render('monVocabs', { error: 'Une erreur est survenue...' });
}

// showGame — si le comptage de mots échoue, la page se charge quand même
try {
  wordCount = await learningModel.countUserWordsByLevel(...);
} catch (countError) {
  console.error('Error counting user words:', countError);
  // wordCount reste à 0 — la page affiche le message "pas assez de mots"
}
```

### 8.5 — Frontend : vérification HTTP standard

Après Phase 2, le frontend utilise `response.ok` (HTTP status code) comme **première ligne de détection d'erreur** — indépendant du format du body :

```javascript
// Pattern .then() chain
.then((response) => {
  if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
  return response.json();
})

// Pattern async/await
if (!response.ok) {
  const errData = await response.json().catch(() => ({}));
  console.error(errData.message || `Erreur HTTP: ${response.status}`);
  return;
}
const data = await response.json();

// Pattern avec affichage du message serveur (vocabQuiz questions)
.then(async (response) => {
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    resultMessage.textContent = errData.message || 'Une erreur est survenue';
    return;
  }
  const data = await response.json();
  // ...
})
```

---

## 9. Arborescence finale

```
src/
├── appFactory.js                              ← enregistre notFoundHandler + errorHandler
├── app/
│   ├── errors/
│   │   └── AppError.js                        ← hiérarchie de classes d'erreurs
│   │
│   ├── middleware/
│   │   ├── asyncHandler.js                    ← Phase 1 : wrapper async → next(err)
│   │   ├── errorHandler.js                    ← Phase 1 : middleware central d'erreurs
│   │   ├── notFoundHandler.js                 ← Phase 1 : catch-all 404
│   │   └── auth.js                            ← isAuthenticatedAPI → { success: false }
│   │
│   ├── controllers/
│   │   ├── WordController.js                  ← Phase 1 : throw pattern
│   │   ├── LearningController.js              ← Phase 1
│   │   ├── LevelProgressController.js         ← Phase 1
│   │   ├── PackageController.js               ← Phase 1
│   │   ├── UserController.js                  ← Phase 1 (partiellement)
│   │   ├── SiteController.js                  ← Phase 1 (feedbackPost)
│   │   ├── apiControllers/
│   │   │   ├── JobController.js               ← Phase 1
│   │   │   ├── TTSController.js               ← Phase 1
│   │   │   ├── ReminderController.js          ← Phase 1
│   │   │   └── ResetPasswordController.js     ← Phase 1
│   │   └── gameControllers/
│   │       ├── GameController.js              ← Phase 2 : supprimé try/catch + auth
│   │       ├── WordScrambleController.js      ← Phase 2
│   │       ├── SpeedVocabController.js        ← Phase 2
│   │       ├── FlashMatchController.js        ← Phase 2 : + throw NotFoundError
│   │       ├── VocabQuizController.js         ← Phase 2 : + throw NotFoundError
│   │       ├── PhraseCompletionController.js  ← Phase 2
│   │       ├── TestPronunController.js        ← Phase 2
│   │       └── WordSearchController.js        ← Phase 1 : throw NotFoundError
│   │
│   ├── services/
│   │   └── importFile.js                      ← Phase 2 : uploadMiddleware + importWords async
│   │
│   └── routes/
│       ├── game/
│       │   ├── game.js                        ← asyncHandler + isAuthenticatedAPI
│       │   ├── word_scramble.js               ← asyncHandler + isAuthenticatedAPI
│       │   ├── flash_match.js                 ← asyncHandler + isAuthenticatedAPI
│       │   ├── speed_vocab.js                 ← asyncHandler + isAuthenticatedAPI
│       │   ├── vocab_quiz.js                  ← asyncHandler + isAuthenticatedAPI
│       │   ├── phrase_completion.js           ← asyncHandler + isAuthenticatedAPI
│       │   ├── word_search.js                 ← asyncHandler + isAuthenticatedAPI
│       │   └── test_pronun.js                 ← asyncHandler + isAuthenticatedAPI
│       └── vocab/
│           └── monVocabs.js                   ← Phase 2 : uploadMiddleware + asyncHandler
│
├── public/js/
│   └── games/
│       ├── speedVocab.js                      ← Phase 2 : response.ok check
│       ├── vocabQuiz.js                       ← Phase 2 : response.ok check (×2)
│       ├── phraseCompletion.js                ← Phase 2 : response.ok check (×2)
│       ├── testPronun.js                      ← Phase 2 : response.ok check
│       ├── wordSearch.js                      ← Phase 2 : headers + saveScore fix + response.ok
│       ├── wordScramble.js                    ← Phase 2 : nettoyage dead code
│       └── flashMatch.js                      ← Phase 2 : nettoyage dead code
│
└── __tests__/
    ├── unit/
    │   ├── appError.test.js                   ← Phase 1 (13 tests)
    │   ├── wordController.test.js             ← Phase 1 corrigé (8 tests)
    │   ├── learningController.test.js         ← Phase 1 corrigé (2 tests)
    │   ├── levelProgressController.test.js    ← Phase 1 corrigé (4 tests)
    │   ├── resetPassword.test.js              ← Phase 1 corrigé (6 tests)
    │   ├── ttsController.test.js              ← Phase 1 corrigé (4 tests)
    │   ├── jobController.test.js              ← Phase 1 corrigé (3 tests)
    │   ├── gameControllerErrors.test.js       ← Phase 2 NOUVEAU (8 tests)
    │   ├── gameApiErrors.test.js              ← Phase 2 NOUVEAU (15 tests)
    │   └── importFile.test.js                 ← Phase 2 NOUVEAU (10 tests)
    └── middleware/
        ├── asyncHandler.test.js               ← Phase 1 (5 tests)
        ├── errorHandler.test.js               ← Phase 1 (19 tests)
        └── notFoundHandler.test.js            ← Phase 1 (2 tests)
```

---

## 10. Phases suivantes

| Phase | Contenu prévu |
|---|---|
| **Phase 3** | Patterns avancés — rate limiting par type d'erreur, retry logic, circuit breaker, logging structuré (Winston/Pino) |
| **Phase 4** | Validation avancée — schémas Joi/Zod, middleware de validation générique, sanitization centralisée |
| **Phase 5** | API Design — versioning, pagination standardisée, HATEOAS, documentation OpenAPI/Swagger |
