# Phase 1 : Error Handling Foundation — Résumé complet

> **Skill** : 5. API Design & Error Handling Patterns  
> **Statut** : Phase 1 terminée et validée (360 tests passent)

---

## 1. Objectif de la Phase 1

Mettre en place une **gestion centralisée des erreurs** pour éliminer la duplication de `try/catch` + `res.status().json()` dans les controllers et garantir un format de réponse cohérent sur toute l'application.

---

## 2. Architecture implémentée

```
Requête HTTP
    │
    ▼
┌─────────────┐
│   Routes    │  ← asyncHandler(controller.method)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Controller  │  ← throw new NotFoundError('Mot non trouvé')
└──────┬──────┘
       │ (Promise rejetée)
       ▼
┌─────────────┐
│asyncHandler │  ← .catch(next) → next(err)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│errorHandler │  ← (err, req, res, next)
└──────┬──────┘
       │
       ├── Client API ?   → res.status(xxx).json({ success: false, message })
       │
       └── Navigateur ?   → res.status(xxx).render('error', { ... })
```

**Principe fondamental** : le controller se concentre sur la logique métier et `throw` quand quelque chose ne va pas. Le formatage de la réponse d'erreur est géré à **un seul endroit** (`errorHandler`).

---

## 3. Fichiers créés (infrastructure)

### 3.1 — `src/app/errors/AppError.js` (existait déjà, inchangé)

Hiérarchie de classes d'erreurs sémantiques :

| Classe | Code HTTP | Cas d'utilisation |
|---|---|---|
| `AppError` (base) | configurable | Classe mère, rarement utilisée directement |
| `ValidationError` | 400 | Données invalides, champs manquants |
| `UnauthorizedError` | 401 | Utilisateur non connecté |
| `ForbiddenError` | 403 | Accès refusé (pas propriétaire) |
| `NotFoundError` | 404 | Ressource inexistante |
| `ConflictError` | 409 | Conflit de données |

Chaque erreur porte :
- `statusCode` — code HTTP automatique
- `isOperational = true` — distingue les erreurs métier des bugs
- `details` — optionnel, pour les erreurs de validation détaillées
- `name` — nom de la classe (pour les tests `instanceof`)

### 3.2 — `src/app/middleware/asyncHandler.js` (créé en Phase 1)

```javascript
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

**Rôle** : Express ne gère pas les rejections de Promise dans les fonctions `async`. Ce wrapper attrape toute erreur (throw ou await rejeté) et la passe à `next(err)` pour qu'Express la route vers `errorHandler`.

### 3.3 — `src/app/middleware/errorHandler.js` (créé en Phase 1)

**Rôle** : Point central unique pour transformer toute erreur en réponse HTTP. Contient deux parties :

**`expectsJson(req)`** — 5 heuristiques pour détecter si le client attend du JSON :
1. Path commence par `/api/` → JSON
2. `req.xhr = true` (XMLHttpRequest) → JSON
3. Header `Accept: application/json` → JSON
4. Header `Content-Type: application/json` → JSON
5. Méthode non-GET sans `Accept: text/html` (ex: `fetch()` POST) → JSON

**`errorHandler(err, req, res, next)`** — middleware Express à 4 arguments :
- Erreur **opérationnelle** (`instanceof AppError`) → code HTTP de l'erreur + message réel
- Erreur **non-opérationnelle** (bug, crash DB) → 500 + message générique + `console.error`
- En **development** : stack trace inclus pour debug
- En **production** : stack trace caché pour sécurité
- Si `res.headersSent` → délègue à Express (évite double réponse)

### 3.4 — `src/app/middleware/notFoundHandler.js` (créé en Phase 1)

```javascript
function notFoundHandler(req, res, next) {
  next(new NotFoundError(`La route ${req.method} ${req.originalUrl} n'existe pas`));
}
```

**Rôle** : Catch-all placé après toutes les routes. Si aucune route ne matche, crée une `NotFoundError` et la passe à `errorHandler`.

### 3.5 — Enregistrement dans `src/appFactory.js`

```javascript
route(app);              // Toutes les routes
app.use(notFoundHandler); // Puis le catch-all 404
app.use(errorHandler);    // Puis le gestionnaire d'erreurs central
```

L'**ordre est crucial** : routes → notFoundHandler → errorHandler.

---

## 4. Controllers refactorisés

### Pattern avant/après

```javascript
// AVANT Phase 1 — code dupliqué dans chaque controller
async deleteWord(req, res) {
  try {
    const word = await wordModel.findUsersByWordId(id);
    if (!word) {
      return res.status(404).json({ success: false, message: 'Mot non trouvé' });
    }
    // ...
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
}

// APRÈS Phase 1 — le controller se concentre sur la logique métier
async deleteWord(req, res) {
  const word = await wordModel.findUsersByWordId(id);
  if (!word) throw new NotFoundError('Mot non trouvé');
  // ...
  res.json({ success: true, message: 'Mot supprimé avec succès' });
}
```

### Liste des controllers refactorisés

| Controller | Méthodes | Erreurs utilisées |
|---|---|---|
| `WordController` | `deleteWord`, `editWordPost`, `addWordPost`, `deleteAllWords` | `NotFoundError`, `ForbiddenError`, `ValidationError` |
| `LearningController` | `checkAndUpdateStreak` | `UnauthorizedError` |
| `LevelProgressController` | `trackGameCompletion`, `resetLevelProgress`, `getLevelProgress` | `ValidationError` |
| `TTSController` | `generateAudio` | `ValidationError` |
| `JobController` | `getJob`, `getActiveJobs` | `NotFoundError`, `ForbiddenError` |
| `ResetPasswordController` | `forgotPasswordPost`, `resetPasswordPost` | `ValidationError`, `AppError` |
| `SiteController` | `feedbackPost` | `ValidationError` |
| `ReminderController` | `reminder`, `testEmail` | `ValidationError` |
| `PackageController` | `createPackagePost`, `deletePackagePost`, `editPackagePost`, `toggleActivationPost`, `copyPackagePost` | `NotFoundError`, `ForbiddenError`, `ValidationError` |
| `UserController` | `editPost`, `changePasswordPost` (JSON) | `ValidationError` |

### Routes protégées par `asyncHandler`

**49 routes async sur 50** sont enveloppées par `asyncHandler`.

La seule exception est `POST /monVocabs/add/import` (`importFile.importWords`) qui utilise le pattern callback de multer et gère ses erreurs localement (nettoyage du fichier uploadé).

---

## 5. Controllers NON refactorisés (intentionnel)

### Catégorie A — Page controllers (dégradation gracieuse)

Ces controllers gardent leur `try/catch` **intentionnellement** car en cas d'erreur, ils re-rendent la même page avec un message d'erreur contextuel au lieu d'afficher la page d'erreur générique :

| Controller | Méthode | Comportement en cas d'erreur |
|---|---|---|
| `WordController` | `monVocabs` | Re-rend la page monVocabs avec `error: "..."` |
| `WordController` | `editWord` | Redirige vers monVocabs avec flash |
| `WordController` | `learnVocabs` | Redirige vers monVocabs avec flash |
| `PackageController` | `myPackages` | Re-rend la page myPackages avec `error: "..."` |
| `UserController` | `dashboard` | Redirige vers /login avec flash |
| `UserController` | `logout` | Redirige vers /login avec flash |
| `GoogleAuthController` | `handleCallback` | Redirige vers /login avec flash |
| `EmailVerificationController` | `verifyEmail` | Redirige avec flash |

### Catégorie B — Game controllers (candidats pour une phase future)

Ces controllers ont des `try/catch` + `res.status(500).json({ error })` **redondants** avec `errorHandler`. Ils sont candidats au refactoring dans une phase future :

| Controller | Méthodes |
|---|---|
| `GameController` | `index`, `showGame`, `saveScore` |
| `WordScrambleController` | `getRandomWordsForScramble` |
| `SpeedVocabController` | `getWordsForSpeedVocab` |
| `FlashMatchController` | `getCardsForFlashMatch` |
| `VocabQuizController` | `getQuestionForVocabQuiz`, `getAvailableWordsCount` |
| `PhraseCompletionController` | `getPhrasesForCompletion`, `getAvailableWordsCount` |
| `TestPronunController` | `getWordsForTestPronun` |

### Catégorie C — Cas spéciaux (pattern callback)

| Controller/Service | Méthode | Raison |
|---|---|---|
| `ImportFile` | `importWords` | Callback multer + cleanup fichier |
| `UserController` | `loginPost` | Callback `session.regenerate` |

---

## 6. Bugs découverts et corrigés (5 audits successifs)

| # | Bug | Fichier | Fix |
|---|---|---|---|
| 1 | `error: {}` dans le template HTML → "Détails techniques" vide en production, `[object Object]` en development | `errorHandler.js` | `error: process.env.NODE_ENV === 'development' ? err.stack : null` |
| 2 | `streamJob` sans `asyncHandler` → rejection non attrapée avant SSE | `routes/api.js` | Ajout de `asyncHandler(jobController.streamJob)` |
| 3 | `GameController` avait le même bug `error: {}` | `GameController.js` | Même fix que bug #1 |
| 4 | `expectsJson()` ne détectait pas les requêtes `fetch()` → HTML renvoyé au lieu de JSON | `errorHandler.js` | Ajout des heuristiques Content-Type JSON + non-GET sans text/html |
| 5 | Import path incorrect pour `NotFoundError` dans `WordSearchController` | `WordSearchController.js` | Correction du chemin d'import |

---

## 7. Tests — État final

### Résultat : **35 suites, 360 tests, tous passent**

### 7.1 — Tests créés (infrastructure Phase 1)

| Fichier | Tests | Couverture |
|---|---|---|
| `__tests__/unit/appError.test.js` | 13 | Hiérarchie complète, statusCode, instanceof, details, stack trace, messages par défaut |
| `__tests__/middleware/asyncHandler.test.js` | 5 | Resolve, reject, sync throw (propagation native), forwarding args |
| `__tests__/middleware/errorHandler.test.js` | 19 | 7 cas `expectsJson`, branche JSON (6 sous-cas + stack dev/prod), branche HTML (3 cas), edge case headersSent |
| `__tests__/middleware/notFoundHandler.test.js` | 2 | Instance NotFoundError, message avec méthode + URL |

### 7.2 — Tests corrigés (cassés par le refactoring)

Le refactoring a changé le pattern : les controllers `throw` au lieu de `res.status().json()`. Les tests doivent utiliser `await expect(...).rejects.toThrow(ErrorClass)`.

| Fichier | Tests corrigés | Changement |
|---|---|---|
| `wordController.test.js` | 8 | auth → redirect, NotFound/Forbidden/Validation → `rejects.toThrow`, DB error → propagation |
| `learningController.test.js` | 2 | UnauthorizedError, DB error propagation |
| `levelProgressController.test.js` | 4 | Supprimé test auth redondant, 3× ValidationError |
| `resetPassword.test.js` | 6 | 5× ValidationError, 1× AppError |
| `ttsController.test.js` | 4 | 3× ValidationError, API error propagation |
| `jobController.test.js` | 3 | NotFoundError, 2× ForbiddenError |
| `asyncHandler.test.js` | 1 | Sync throw → vérification propagation native |

### 7.3 — Tests d'intégration (inchangés, passent)

`site.integration.test.js` valide le pipeline complet via supertest :
- `POST /feedback` sans champs → 400 `{ success: false }`
- `GET /nonexistent` → 404

---

## 8. Concepts clés à retenir

### Erreur opérationnelle vs erreur de programmation

| Type | Exemple | `instanceof AppError` | Réponse client |
|---|---|---|---|
| **Opérationnelle** | Mot non trouvé, champ manquant, accès refusé | `true` | Message réel de l'erreur |
| **Programmation** | Bug JS, crash DB, TypeError | `false` | "Une erreur interne est survenue" |

Les erreurs opérationnelles sont **attendues** et **sûres** à montrer au client.
Les erreurs de programmation sont des **bugs** — on les logue en console et on cache les détails.

### Séparation des responsabilités

| Composant | Responsabilité unique |
|---|---|
| `AppError` + sous-classes | Définir le vocabulaire d'erreurs (quoi) |
| Controller | Logique métier + `throw` (quand) |
| `asyncHandler` | Attraper les rejections async (transport) |
| `errorHandler` | Formater la réponse (comment) |
| `notFoundHandler` | Détecter les routes inexistantes |
| `expectsJson` | Détecter le format attendu (JSON vs HTML) |

### Format de réponse standardisé

```json
// Succès
{ "success": true, "message": "..." }

// Erreur (opérationnelle)
{ "success": false, "message": "Mot non trouvé" }

// Erreur (opérationnelle avec détails)
{ "success": false, "message": "Données invalides", "details": [...] }

// Erreur (non-opérationnelle, development)
{ "success": false, "message": "Une erreur interne est survenue...", "stack": "..." }

// Erreur (non-opérationnelle, production)
{ "success": false, "message": "Une erreur interne est survenue..." }
```

---

## 9. Ce qui reste pour les phases suivantes

| Phase | Contenu |
|---|---|
| **Phase 2** | Refactoring des game controllers (supprimer les try/catch redondants), standardisation du format `{ success, message }` partout, promisification de `importFile.importWords` |
| **Phase 3** | Patterns avancés — rate limiting par erreur, retry logic, circuit breaker, logging structuré |
| **Phase 4** | Validation avancée — schémas de validation (Joi/Zod), middleware de validation générique |

---

## 10. Arborescence des fichiers Phase 1

```
src/
├── appFactory.js                          ← enregistre notFoundHandler + errorHandler
├── app/
│   ├── errors/
│   │   └── AppError.js                    ← hiérarchie de classes d'erreurs
│   ├── middleware/
│   │   ├── asyncHandler.js                ← wrapper async → next(err)
│   │   ├── errorHandler.js                ← middleware central de gestion d'erreurs
│   │   └── notFoundHandler.js             ← catch-all pour routes inexistantes
│   ├── controllers/
│   │   ├── WordController.js              ← refactorisé (throw pattern)
│   │   ├── LearningController.js          ← refactorisé
│   │   ├── LevelProgressController.js     ← refactorisé
│   │   ├── PackageController.js           ← refactorisé
│   │   ├── UserController.js              ← partiellement refactorisé
│   │   ├── SiteController.js              ← refactorisé (feedbackPost)
│   │   └── apiControllers/
│   │       ├── JobController.js           ← refactorisé
│   │       ├── TTSController.js           ← refactorisé
│   │       ├── ReminderController.js      ← refactorisé
│   │       └── ResetPasswordController.js ← refactorisé
│   └── routes/                            ← asyncHandler appliqué (49/50 routes)
└── __tests__/
    ├── unit/
    │   ├── appError.test.js               ← NOUVEAU (13 tests)
    │   ├── wordController.test.js         ← CORRIGÉ (8 tests)
    │   ├── learningController.test.js     ← CORRIGÉ (2 tests)
    │   ├── levelProgressController.test.js← CORRIGÉ (4 tests)
    │   ├── resetPassword.test.js          ← CORRIGÉ (6 tests)
    │   ├── ttsController.test.js          ← CORRIGÉ (4 tests)
    │   └── jobController.test.js          ← CORRIGÉ (3 tests)
    └── middleware/
        ├── asyncHandler.test.js           ← NOUVEAU (5 tests)
        ├── errorHandler.test.js           ← NOUVEAU (19 tests)
        └── notFoundHandler.test.js        ← NOUVEAU (2 tests)
```
