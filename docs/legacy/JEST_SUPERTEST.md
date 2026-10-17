# Jest + Supertest – Tests d’intégration

Quelques tests d’intégration pour les routes **auth** (login, registre, logout). À lancer depuis **`src/`**.

## Lancer les tests

```bash
cd src
npm test
```

En mode watch (relance à chaque modification) :

```bash
npm run test:watch
```

## Structure

- **Config** : `src/jest.config.cjs`
- **App pour intégration** : `getApp()` dans `src/appFactory.js` (DB mockée dans chaque file d'intégration).
- **Fichiers de test** :
  - **Unit** : `__tests__/middleware/auth.test.js`, `__tests__/middleware/flash.test.js`, `__tests__/unit/sanitization.test.js`
  - **Integration** : `__tests__/auth.integration.test.js`, `__tests__/protected-routes.integration.test.js`, `__tests__/site.integration.test.js`

## Tests couverts

| Fichier | Route / comportement | Attendu |
|---------|----------------------|--------|
| **auth** | `GET /login`, `/login/forgotPassword`, `GET /registre` | 200 |
| | `POST /login` (champs vides / user inexistant) | 400 JSON |
| | `POST /registre` (champs manquants / mots de passe différents / &lt; 6 car.) | 400 JSON |
| | `GET /logout` | 302 + redirect |
| **protected-routes** | `GET /dashboard`, `/monVocabs`, `/myPackages`, `/games` (sans session) | 302 → /login |
| | `POST /update-streak` (sans session) | 401 JSON |
| **site** | `GET /` | 200, page Accueil |
| | `GET /aboutme` | 200, page À propos |
| | `GET /feedback` | 200, page Feedback |

**Unit** : auth (6), flash (5), sanitization (11). **Integration** : auth (10), protected-routes (5), site (3). Total ~39 tests.

Pour étendre : ajouter des `describe` / `it` dans le fichier concerné, ou créer un nouveau `*.test.js` (unit) / `*.integration.test.js` dans `__tests__/`.
