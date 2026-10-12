# API Design & Error Handling Patterns — Phase 1 + Phase 2 + Phase 3

> **Skill** : 5. API Design & Error Handling Patterns  
> **État final** : Phase 1 + Phase 2 + Phase 3 terminées et validées — **40 suites, 401 tests passent**

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture centralisée](#2-architecture-centralisée)
3. [Infrastructure créée (Phase 1)](#3-infrastructure-créée-phase-1)
4. [Phase 1 — Refactoring des controllers métier](#4-phase-1--refactoring-des-controllers-métier)
5. [Phase 2 — Uniformisation complète](#5-phase-2--uniformisation-complète)
6. [Phase 3 — Validation Layer & Rate Limiter Integration](#6-phase-3--validation-layer--rate-limiter-integration)
7. [Bugs découverts et corrigés (toutes phases)](#7-bugs-découverts-et-corrigés-toutes-phases)
8. [Tests](#8-tests)
9. [Concepts clés](#9-concepts-clés)
10. [Arborescence finale](#10-arborescence-finale)
11. [Phases suivantes](#11-phases-suivantes)

---

## 1. Vue d'ensemble

### Le problème initial (avant Phase 1)

Chaque controller gérait ses erreurs localement :

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
- Validation absente — pas de schemas, chaque controller validait manuellement
- Non maintenable — changer le format d'erreur = modifier ~30 fichiers

### L'évolution à travers les 3 phases

```javascript
// PHASE 1 — Controller propre, logique métier uniquement
async deleteWord(req, res) {
  const word = await wordModel.findUsersByWordId(id);
  if (!word) throw new NotFoundError('Mot non trouvé');
  res.json({ success: true, message: 'Mot supprimé' });
}

// PHASE 2 — Game controllers uniformisés, frontend corrigé, importFile refactorisé

// PHASE 3 — Validation automatique par schemas, rate limiter intégré au pipeline
// Route: rateLimiter → validate(schema) → asyncHandler(controller)
```

---

## 2. Architecture centralisée

### Flux complet (après Phase 3)

```
Client
  │
  ▼
┌──────────────────────┐
│ globalLimiter        │  ← 100 req/min (AVANT session)
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ initializeMiddleware │  ← sanitization, security, session, flash
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Route-specific       │  ← loginLimiter, ttsLimiter, feedbackLimiter...
│ rateLimiter          │     handler: next(TooManyRequestsError)
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ validate(schema)     │  ← express-validator schemas
│                      │     next(ValidationError { details: [...] })
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ asyncHandler(ctrl)   │  ← Promise.resolve(fn()).catch(next)
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Controller           │  ← throw NotFoundError / ForbiddenError / etc.
└────────┬─────────────┘
         │ (Promise rejetée ou throw)
         ▼
┌──────────────────────┐
│ errorHandler         │  ← (err, req, res, next)
└────────┬─────────────┘
         │
         ├─── expectsJson? → res.status(xxx).json({ success: false, message, details })
         │
         └─── Navigateur? → res.status(xxx).render('error', { ... })
```

**Ordre d'enregistrement dans `appFactory.js`** (crucial) :

```javascript
app.use(globalLimiter);    // 0. Rate limit global
initializeMiddleware(app); // 1. Session, security, flash
route(app);                // 2. Toutes les routes
app.use(notFoundHandler);  // 3. Catch-all 404
app.use(errorHandler);     // 4. Gestionnaire d'erreurs central
```

---

## 3. Infrastructure créée (Phase 1)

### 3.1 — Hiérarchie d'erreurs : `src/app/errors/AppError.js`

| Classe | Code HTTP | Cas d'utilisation | Phase |
|---|---|---|---|
| `AppError` (base) | configurable | Classe mère abstraite | P1 |
| `ValidationError` | 400 | Données invalides, champs manquants | P1 |
| `UnauthorizedError` | 401 | Utilisateur non connecté | P1 |
| `ForbiddenError` | 403 | Accès refusé (pas propriétaire) | P1 |
| `NotFoundError` | 404 | Ressource inexistante | P1 |
| `ConflictError` | 409 | Conflit de données | P1 |
| `TooManyRequestsError` | 429 | Rate limit dépassé | **P3** |

Chaque erreur porte :
- `statusCode` — code HTTP automatique
- `isOperational = true` — distingue erreurs métier des bugs
- `details` — optionnel, pour validation détaillée (Phase 3)
- `name` — nom de la classe (pour `instanceof`)

### 3.2 — `src/app/middleware/asyncHandler.js`

```javascript
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

Express 4 ne gère pas les rejections de Promise. Ce wrapper attrape toute erreur et la passe à `next(err)`.

### 3.3 — `src/app/middleware/errorHandler.js`

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

### Controllers NON refactorisés (intentionnel)

**Dégradation gracieuse (HTML)** — gardent un try/catch pour re-rendre la page avec un message contextuel :
- `WordController.monVocabs` — re-rend monVocabs avec `error: "..."`
- `PackageController.myPackages` — re-rend myPackages avec `error: "..."`
- `UserController.dashboard/logout` — redirige vers /login avec flash
- `GoogleAuthController.handleCallback` — redirige avec flash

---

## 5. Phase 2 — Uniformisation complète

### 5.1 — Game controllers refactorisés (8 controllers)

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

### 5.2 — Refactoring `importFile.js`

**Avant** : une seule fonction callback qui gérait multer + parsing + validation + nettoyage.

**Après** : séparation en deux composants :
- `uploadMiddleware` — gère multer, convertit ses erreurs en ValidationError
- `importWords` — fonction async propre, throw pour chaque erreur

### 5.3 — Corrections frontend (9 fichiers JS)

Le changement format backend `{ error: "..." }` → `{ success: false, message: "..." }` nécessitait d'adapter le frontend :

```javascript
// AVANT — ne détecte plus les erreurs
.then((data) => { if (data.error) { ... } })

// APRÈS — standard HTTP professionnel
.then((response) => {
  if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
  return response.json();
})
```

### 5.4 — Bug critique corrigé : wordSearch saveScore

Route inexistante `POST /games/wordSearch/saveScore` → `POST /games/score` avec body complet.

---

## 6. Phase 3 — Validation Layer & Rate Limiter Integration

### 6.1 — Objectif

Phase 3 comble deux manques critiques identifiés après Phase 2 :
1. **Validation absente** — des schemas express-validator existaient mais n'étaient PAS appliqués aux routes
2. **Rate limiter bypass** — `express-rate-limit` envoyait du JSON brut, contournant `errorHandler`

### 6.2 — Nouveau composant : `src/app/validation/validate.js`

Deux middleware factories qui exécutent les mêmes schemas mais gèrent les erreurs différemment :

**`validate(schemas)`** — Pour les routes API/JSON :

```javascript
function validate(schemas) {
  return async (req, res, next) => {
    try {
      for (const schema of schemas) { await schema.run(req); }
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const details = errors.array().map((err) => ({
          field: err.path, message: err.msg, value: err.value,
        }));
        return next(new ValidationError('Données de validation invalides', details));
      }
      next();
    } catch (err) { next(err); }
  };
}
```

**`validateForm(schemas, redirectUrl)`** — Pour les routes formulaires HTML (infrastructure prête, non utilisée actuellement car toutes les routes POST utilisent fetch/AJAX) :

```javascript
function validateForm(schemas, redirectUrl) {
  return async (req, res, next) => {
    try {
      for (const schema of schemas) { await schema.run(req); }
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const messages = errors.array().map((err) => err.msg);
        setFlash(req, 'error', messages.join('. '));
        return res.redirect(redirectUrl);
      }
      next();
    } catch (err) { next(err); }
  };
}
```

### 6.3 — Schemas par domaine

Les schemas existaient déjà dans `src/app/validation/schemas/`. Phase 3 les a branchés aux routes.

| Fichier | Schemas | Routes couvertes |
|---|---|---|
| `auth.schema.js` | `loginSchema`, `registreSchema`, `forgotPasswordSchema`, `resetPasswordSchema` | POST /login, /registre, /forgotPassword, /resetPassword |
| `game.schema.js` | `packageQuerySchema`, `saveScoreSchema`, `showGameSchema`, `trackGameSchema`, `resetLevelSchema` | POST /games/score, GET /games/:gameType, 7 sous-routes /words, /level-progress/* |
| `api.schema.js` | `ttsGenerateSchema`, `dashboardEditSchema` | POST /api/tts/generate, POST /dashboard/edit |
| `site.schema.js` | `feedbackSchema` | POST /feedback |
| `package.schema.js` | `createPackageSchema`, `editPackageSchema`, `packageIdParam` | POST /myPackages, /delete/:id, /edit/:id, /toggle-activation/:id, /copy/:id |
| `word.schema.js` | `addWordSchema`, `editWordSchema`, `deleteWordSchema`, `deleteAllWordsSchema` | GET+POST /monVocabs/add, /delete/:id, /edit/:id, /deleteAll, /learn |

### 6.4 — Routes mises à jour (Etapes 2-5)

Chaque route suit maintenant le pattern :

```javascript
router.post('/path', rateLimiter, validate(schema), asyncHandler(controller.method))
```

**28+ routes** ont reçu `validate(schema)` :

| Groupe | Routes mises à jour | Fichier route |
|---|---|---|
| Auth | POST /login, /registre, /forgotPassword, /resetPassword (×2) | `login.js`, `registre.js`, `dashboard.js` |
| Game | POST /games/score, GET /games/:gameType | `game.js` |
| Game sub-routes | 7× GET /words (ou /cards, /questions, /phrases) | `word_scramble.js`, `flash_match.js`, `speed_vocab.js`, `vocab_quiz.js`, `phrase_completion.js`, `word_search.js`, `test_pronun.js` |
| API | POST /api/tts/generate | `api.js` |
| Dashboard | POST /dashboard/edit, /dashboard/resetPassword | `dashboard.js` |
| Site | POST /feedback | `site.js` |
| Package | POST /, /delete/:id, PUT /edit/:id, /toggle-activation/:id, /copy/:id | `package.js` |
| Vocab | GET+POST /add, /deleteAll, /delete/:id, GET+POST /edit/:id, GET /learn | `monVocabs.js` |
| Level | POST /track, /reset | `level_progress.js` |

### 6.5 — Cleanup des controllers

La validation étant maintenant dans le middleware, les checks manuels redondants ont été supprimés :

| Controller | Code supprimé |
|---|---|
| `UserController.loginPost` | `if (!username \|\| !password)` |
| `UserController.registrePost` | `if (!username \|\| !email \|\| !password \|\| !password2)`, `if (password !== password2)`, `if (password.length < 6)` |
| `ResetPasswordController.resetPasswordPost` | `if (password !== confirm_password)` |
| `GameController.showGame` | `validGames` array check |
| `GameController.saveScore` | `validGames` array check + `ValidationError` import |
| `TTSController.generateAudio` | `if (!text)`, `if (!language)` — changé "no voices" en `AppError(422)` |
| `SiteController.feedbackPost` | `if (!type \|\| !subject \|\| !content)` |
| `WordController.editWordPost` | `if (!word \|\| !language_code \|\| ...)` |

**Note architecturale** : `WordController.addWordPost` conserve `validateWords()` pour la validation complexe multi-mots dans le body, tandis que `addWordSchema` valide uniquement `query.package`.

### 6.6 — Refactoring Rate Limiter (Etape 6)

**Problème** : `express-rate-limit` envoyait `res.send({ success: false, message: "..." })` directement, contournant `errorHandler` :

```
AVANT:
  Rate limit atteint → res.send(JSON) → bypass errorHandler
  ❌ Routes HTML reçoivent du JSON brut
  ❌ Pas de logging centralisé
  ❌ Format incohérent
```

**Solution** : factory `createLimiter` + handler intégré au pipeline :

```javascript
function createLimiter({ message, ...config }) {
  return safeLimiter(
    rateLimit({
      ...config,
      handler: (_req, _res, next) => {
        next(new TooManyRequestsError(message));
      },
    })
  );
}
```

```
APRÈS:
  Rate limit atteint → handler: next(TooManyRequestsError)
                      → safeLimiter forwarde l'erreur
                      → errorHandler
                      → JSON ou HTML automatique ✓
```

**`safeLimiter` mis à jour** pour distinguer :
- `TooManyRequestsError` → forwarded au pipeline (429 intentionnel)
- Erreur store Redis → swallowed, requête passe (fail-open)

**7 limiters refactorisés** : `loginLimiter`, `registerLimiter`, `forgotPasswordLimiter`, `ttsLimiter`, `globalLimiter`, `emailLimiter`, `feedbackLimiter`

### 6.7 — Cas limite vérifié : `globalLimiter` avant session

`globalLimiter` est appliqué dans `appFactory.js` AVANT `initializeMiddleware` (session). Quand il trigger un 429, `req.session` est `undefined`. `errorHandler` gère cela via optional chaining : `req.session?.user` → `undefined` sans crash.

### 6.8 — Points de brainstorming résolus

**Q : Pourquoi certains controllers gèrent les erreurs différemment (try/catch local vs throw) ?**

Deux patterns coexistent intentionnellement :
- **throw → errorHandler** : pour les erreurs qui arrêtent le flux (validation, auth, not found)
- **try/catch interne** : pour la dégradation gracieuse HTML — re-rend la page avec `wordCount: 0` au lieu d'une page d'erreur

**Q : Le refactoring du rate limiter casse-t-il Redis ?**

Non. Le changement ne touche que le "dernier kilomètre" — ce qui se passe APRÈS que Redis a déterminé que la limite est atteinte. La mécanique de comptage Redis (RedisStore, buildStore, prefixes) est 100% intacte.

**Q : `validateForm()` est inutilisé — est-ce un problème ?**

Non. Toutes les routes POST actuelles utilisent fetch/AJAX (réponse JSON). `validateForm()` est de l'infrastructure testée et prête pour un futur formulaire HTML traditionnel.

---

## 7. Bugs découverts et corrigés (toutes phases)

### Phase 1 — 5 bugs

| # | Bug | Sévérité | Fix |
|---|---|---|---|
| 1 | `error: {}` dans template HTML | Moyenne | `err.stack` en dev, `null` en prod |
| 2 | `streamJob` sans `asyncHandler` | Haute | Ajout `asyncHandler` |
| 3 | `GameController` même bug `error: {}` | Moyenne | Même fix |
| 4 | `expectsJson()` ne détectait pas `fetch()` | Critique | Ajout heuristiques Content-Type + non-GET |
| 5 | Import path incorrect `NotFoundError` | Basse | Correction chemin |

### Phase 2 — 4 bugs

| # | Bug | Sévérité | Fix |
|---|---|---|---|
| 6 | Frontend `data.error` → `undefined` après changement format | Critique | `response.ok` check dans 9 fichiers JS |
| 7 | `vocabs.js` deleteWord → échec silencieux | Haute | `response.ok` + `data.success === false` |
| 8 | `wordSearch.js` saveScore → route inexistante | Critique | URL `/games/score` + body complet |
| 9 | `wordSearch.js` fetch sans headers JSON | Haute | Ajout `Content-Type: application/json` |

### Phase 3 — 9 erreurs trouvées et corrigées pendant l'implémentation

| # | Erreur | Fichier | Fix |
|---|---|---|---|
| 10 | `jest --testPathPattern` deprecated | CLI | Remplacé par `--testPathPatterns` |
| 11 | `module.exports = validate` → `{ validate, validateForm }` cassait les imports existants | `level_progress.js` | `const { validate } = require(...)` |
| 12 | Test unit `resetPassword` "passwords don't match" échoue (validation déplacée au middleware) | `resetPassword.test.js` | Test supprimé, couvert par intégration |
| 13 | Tests intégration auth attendaient ancien format `res.body.message` | `auth.integration.test.js`, `auth-flow.integration.test.js` | Assertions sur `res.body.details[]` |
| 14 | Tests unit `gameControllerErrors` "invalid game_type" échouent | `gameControllerErrors.test.js` | Tests supprimés, validation au middleware |
| 15 | `VALID_LANGS` non exporté de `wordProcessingService.js` → `undefined.join()` | `wordProcessingService.js` | Export `VALID_LANGS`, `VALID_TYPES`, `VALID_LEVELS` |
| 16 | Tests unit `ttsController` "missing text/language" échouent | `ttsController.test.js` | Tests supprimés + "no voices" → `AppError(422)` |
| 17 | Test unit `wordController` "editWordPost missing fields" échoue | `wordController.test.js` | Test supprimé |
| 18 | Test intégration `site` "POST /feedback missing fields" attend ancien format | `site.integration.test.js` | Assertions sur `res.body.details[]` |

---

## 8. Tests

### État final : **40 suites, 401 tests, tous passent**

### 8.1 — Tests infrastructure (Phase 1) — 39 tests

| Fichier | Tests | Couverture |
|---|---|---|
| `appError.test.js` | 18 (+5 P3) | Hiérarchie complète incluant `TooManyRequestsError` |
| `asyncHandler.test.js` | 5 | Resolve, reject, sync throw |
| `errorHandler.test.js` | 14 (+1 P3) | expectsJson (7), JSON (7 dont TooManyRequestsError 429), HTML (3), edge (1) |
| `notFoundHandler.test.js` | 2 | Instance NotFoundError, message avec méthode + URL |

### 8.2 — Tests Phase 2 — 33 tests

| Fichier | Tests |
|---|---|
| `gameControllerErrors.test.js` | 6 (8 - 2 migrés au middleware) |
| `gameApiErrors.test.js` | 15 |
| `importFile.test.js` | 10 |

### 8.3 — Tests Phase 3 (NOUVEAUX) — 12 tests

| Fichier | Tests | Ce qu'il vérifie |
|---|---|---|
| **`validate.test.js`** | 6 | `validate()` : crée ValidationError avec details par champ, next() si valide, inclut value. `validateForm()` : redirect + flash, next() si valide, messages joints par ". " |
| **`rateLimiter.test.js`** | 3 | 7 limiters exportés comme fonctions, requête autorisée sous la limite, `TooManyRequestsError` quand limite dépassée |

### 8.4 — Tests existants adaptés (Phase 3)

| Fichier | Modification |
|---|---|
| `appError.test.js` | Ajout `TooManyRequestsError` à la table describe.each (429, default msg, custom msg, instanceof) |
| `errorHandler.test.js` | Ajout test `TooManyRequestsError → 429 + { success: false }` |
| `resetPassword.test.js` | Supprimé test "passwords don't match" (migré au schema) |
| `gameControllerErrors.test.js` | Supprimé 2 tests "invalid game_type" (migrés au schema) |
| `ttsController.test.js` | Supprimé 2 tests "missing text/language" + changé "no voices" → `AppError(422)` |
| `wordController.test.js` | Supprimé test "editWordPost missing fields" |
| `auth.integration.test.js` | Assertions `res.body.details[]` au lieu de `res.body.message` |
| `auth-flow.integration.test.js` | Assertions `res.body.details[]` pour confirm_password |
| `site.integration.test.js` | Assertions `res.body.details[]` pour feedback fields |

---

## 9. Concepts clés

### 9.1 — Erreur opérationnelle vs erreur de programmation

| Type | Exemple | `instanceof AppError` | Réponse client |
|---|---|---|---|
| **Opérationnelle** | Mot non trouvé, validation échouée, rate limit, accès refusé | `true` | Message réel de l'erreur |
| **Programmation** | Bug JS, crash DB, TypeError | `false` | "Une erreur interne est survenue" |

### 9.2 — Séparation des responsabilités (Phase 3 finale)

| Composant | Responsabilité unique |
|---|---|
| `AppError` + sous-classes | Définir le vocabulaire d'erreurs (quoi) |
| Schemas (`auth.schema.js`, etc.) | Définir les règles de validation (quoi valider) |
| `validate()` / `validateForm()` | Exécuter les schemas + formater les erreurs (comment valider) |
| `createLimiter()` / `safeLimiter()` | Créer des rate limiters intégrés au pipeline (quand limiter) |
| Controller | Logique métier + `throw` (quand l'erreur survient) |
| `asyncHandler` | Attraper les rejections async (transport) |
| `errorHandler` | Formater la réponse finale JSON/HTML (comment répondre) |
| `notFoundHandler` | Détecter les routes inexistantes |
| `expectsJson` | Détecter le format attendu (JSON vs HTML) |

### 9.3 — Format de réponse standardisé

```json
// Succès
{ "success": true, "message": "Mot supprimé avec succès" }

// Erreur validation (Phase 3)
{
  "success": false,
  "message": "Données de validation invalides",
  "details": [
    { "field": "email", "message": "Format d'email invalide", "value": "not-an-email" },
    { "field": "password", "message": "Le mot de passe est requis" }
  ]
}

// Erreur rate limit (Phase 3)
{
  "success": false,
  "message": "Trop de tentatives de connexion. Réessayez dans 15 minutes."
}
// + Headers: RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, Retry-After

// Erreur opérationnelle
{ "success": false, "message": "Mot non trouvé" }

// Erreur non-opérationnelle (development)
{ "success": false, "message": "Une erreur interne est survenue...", "stack": "..." }

// Erreur non-opérationnelle (production)
{ "success": false, "message": "Une erreur interne est survenue..." }
```

### 9.4 — Pattern middleware chain

L'ordre des middlewares dans chaque route suit une logique stricte :

```
1. Auth         → refuse les non-connectés AVANT toute logique
2. Rate Limiter → refuse les abus AVANT validation (économise des ressources)
3. validate()   → refuse les données invalides AVANT le controller
4. asyncHandler → attrape les erreurs du controller
5. Controller   → logique métier pure, throw si erreur
```

### 9.5 — Dégradation gracieuse

Trois niveaux de dégradation sont utilisés dans l'app :

| Niveau | Exemple | Pattern |
|---|---|---|
| **Rate limiter** | Redis down | `safeLimiter` : swallow store error, request passe (fail-open) |
| **Controller HTML** | Word count DB fail | try/catch interne, `wordCount: 0`, page se rend |
| **Global** | Toute erreur non-opérationnelle | `errorHandler` → 500 + message générique |

---

## 10. Arborescence finale

```
src/
├── appFactory.js                              ← globalLimiter + notFoundHandler + errorHandler
├── app/
│   ├── errors/
│   │   └── AppError.js                        ← P1: 5 classes + P3: TooManyRequestsError
│   │
│   ├── validation/                            ← P3: NOUVEAU dossier fonctionnel
│   │   ├── validate.js                        ← P3: validate() + validateForm()
│   │   └── schemas/
│   │       ├── auth.schema.js                 ← loginSchema, registreSchema, forgot, reset
│   │       ├── game.schema.js                 ← packageQuery, saveScore, showGame, track, resetLevel
│   │       ├── api.schema.js                  ← ttsGenerate, dashboardEdit
│   │       ├── site.schema.js                 ← feedbackSchema
│   │       ├── package.schema.js              ← create, edit, packageIdParam
│   │       └── word.schema.js                 ← add, edit, delete, deleteAll
│   │
│   ├── middleware/
│   │   ├── asyncHandler.js                    ← P1
│   │   ├── errorHandler.js                    ← P1
│   │   ├── notFoundHandler.js                 ← P1
│   │   ├── rateLimiter.js                     ← P3: createLimiter + safeLimiter + TooManyRequestsError
│   │   ├── flash.js                           ← setFlash (utilisé par validateForm)
│   │   └── auth.js                            ← isAuthenticated, isAuthenticatedAPI
│   │
│   ├── controllers/
│   │   ├── WordController.js                  ← P1+P3: throw + validation supprimée
│   │   ├── UserController.js                  ← P1+P3: throw + validation supprimée
│   │   ├── SiteController.js                  ← P1+P3: throw + validation supprimée
│   │   ├── PackageController.js               ← P1
│   │   ├── LearningController.js              ← P1
│   │   ├── LevelProgressController.js         ← P1
│   │   ├── apiControllers/
│   │   │   ├── TTSController.js               ← P1+P3: validation → schema, "no voices" → AppError(422)
│   │   │   ├── JobController.js               ← P1
│   │   │   └── ReminderController.js          ← P1
│   │   ├── authControllers/
│   │   │   ├── ResetPasswordController.js     ← P1+P3: validation supprimée
│   │   │   └── ...
│   │   └── gameControllers/
│   │       ├── GameController.js              ← P2+P3: validGames supprimé
│   │       └── ...                            ← P2
│   │
│   ├── routes/
│   │   ├── user/login.js                      ← P3: validate(loginSchema) + validate(forgotPasswordSchema)
│   │   ├── user/registre.js                   ← P3: validate(registreSchema)
│   │   ├── user/dashboard.js                  ← P3: validate(resetPasswordSchema) + validate(dashboardEditSchema)
│   │   ├── game/game.js                       ← P3: validate(saveScoreSchema) + validate(showGameSchema)
│   │   ├── game/word_scramble.js              ← P3: validate(packageQuerySchema)
│   │   ├── game/flash_match.js                ← P3: validate(packageQuerySchema)
│   │   ├── game/speed_vocab.js                ← P3: validate(packageQuerySchema)
│   │   ├── game/vocab_quiz.js                 ← P3: validate(packageQuerySchema)
│   │   ├── game/phrase_completion.js           ← P3: validate(packageQuerySchema)
│   │   ├── game/word_search.js                ← P3: validate(packageQuerySchema)
│   │   ├── game/test_pronun.js                ← P3: validate(packageQuerySchema)
│   │   ├── api.js                             ← P3: validate(ttsGenerateSchema)
│   │   ├── site.js                            ← P3: validate(feedbackSchema)
│   │   ├── package/package.js                 ← P3: validate(create/edit/packageIdParam)
│   │   ├── vocab/monVocabs.js                 ← P3: validate(add/edit/delete/deleteAll)
│   │   └── level_progress.js                  ← P3: validate(trackGame/resetLevel)
│   │
│   └── services/
│       ├── importFile.js                      ← P2: uploadMiddleware + importWords
│       └── wordProcessingService.js           ← P3: export VALID_LANGS, VALID_TYPES, VALID_LEVELS
│
├── public/js/games/                           ← P2: response.ok check dans 9 fichiers
│
└── __tests__/
    ├── unit/
    │   ├── appError.test.js                   ← P1+P3: 18 tests (incl. TooManyRequestsError)
    │   ├── rateLimiter.test.js                ← P2+P3: exports + safeLimiter
    │   ├── gameControllerErrors.test.js       ← P2+P3: 6 tests (2 supprimés)
    │   ├── gameApiErrors.test.js              ← P2: 15 tests
    │   ├── importFile.test.js                 ← P2: 10 tests
    │   ├── wordController.test.js             ← P1+P3: adapté
    │   ├── ttsController.test.js              ← P1+P3: adapté
    │   ├── resetPassword.test.js              ← P1+P3: adapté
    │   └── ...
    ├── middleware/
    │   ├── asyncHandler.test.js               ← P1: 5 tests
    │   ├── errorHandler.test.js               ← P1+P3: 20 tests (incl. 429)
    │   ├── notFoundHandler.test.js            ← P1: 2 tests
    │   ├── validate.test.js                   ← P3 NOUVEAU: 6 tests
    │   └── rateLimiter.test.js                ← P3 NOUVEAU: 3 tests
    └── integration/
        ├── auth.integration.test.js           ← P3: assertions res.body.details
        ├── auth-flow.integration.test.js      ← P3: assertions res.body.details
        └── site.integration.test.js           ← P3: assertions res.body.details
```

---

## 11. Phases suivantes

| Phase | Contenu prévu | Remarque |
|---|---|---|
| **Phase 4** | Resilience Patterns — retry logic, circuit breaker | Patterns avancés pour appels externes (Google TTS, email) |
| **Phase 5** | API Design — versioning, pagination, documentation | Structuration API pour scalabilité |
| *Séparé* | Structured Logging (Winston/Pino) | Skill dédiée "Structured Logging & Error Handling" |
