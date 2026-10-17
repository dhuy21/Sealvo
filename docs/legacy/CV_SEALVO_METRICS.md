# SEALVO — Métriques vérifiées pour CV

> Tous les chiffres ci-dessous sont extraits directement du code source par comptage.
> Aucun chiffre n'est inventé. Les éléments non vérifiables sont marqués clairement.

---

## 1. Architecture & Infrastructure

| Métrique | Valeur | Source |
|----------|--------|--------|
| Services cloud Railway | **7** (Web, Worker, Scheduler, MySQL, Redis, RabbitMQ, Backup S3) | `docker-compose.yml` + CI/CD |
| Jobs CI/CD GitHub Actions | **6** (Lint & Test, Build/Scan/Push, Deploy Prod, Deploy Staging, E2E Prod, E2E Staging) | `.github/workflows/ci-cd.yml` |
| Étapes CI/CD totales | Audit npm, ESLint, Prettier, Jest, Docker build, Trivy scan, deploy 3 services, healthcheck, E2E Playwright, artifact upload | `.github/workflows/ci-cd.yml` |
| Dockerfile stages | **3** (builder → deps → runner) | `Dockerfile` |
| Queues RabbitMQ | **6** queues (main + retry + dead-letter) × 2 consumers (email + import) | `app/queues/emailQueue.js`, `importQueue.js` |
| Backups | Service CRON dédié, `mysqldump` → AWS S3 | `Dockerfile.backup`, `scripts/backup-db.js` |

## 2. Backend

| Métrique | Valeur | Source |
|----------|--------|--------|
| Endpoints API REST | **57** (GET/POST/PUT/DELETE) | 22 fichiers dans `app/routes/` |
| Controllers | **20** (dont 7 game, 3 API, 3 auth) | `app/controllers/` |
| Models | **7** | `app/models/` |
| Services | **6** (Gemini, TTS, email, import, streak, word processing) | `app/services/` |
| Core modules | **6** (cache, database, jobTracker, rabbitmq, redis, resilience) | `app/core/` |
| Validation schemas | **7** (api, auth, game, package, site, word + validate.js) | `app/validation/` |
| Patterns de résilience | **3** (Timeout, Retry exponential backoff + jitter, Circuit Breaker) | `app/core/resilience.js` |

## 3. Sécurité

| Mécanisme | Détail | Fichier |
|-----------|--------|---------|
| Helmet | 13+ headers HTTP sécurisés | `middleware/security.js` |
| CSP | `strict-dynamic` + nonces cryptographiques (`crypto.randomBytes`) | `middleware/security.js` |
| HSTS | `maxAge: 31536000`, `includeSubDomains`, `preload` | `middleware/security.js` |
| Permissions-Policy | camera, geolocation, payment, USB, etc. bloqués | `middleware/security.js` |
| CSRF | Double-submit cookie | `middleware/csrf.js` |
| Rate limiting | Global + par endpoint (login, email, feedback) | `middleware/rateLimiter.js` |
| Authentification | `isAuthenticated`, `isAuthenticatedAPI`, OAuth2 Google | `middleware/auth.js` |
| Secret comparison | `crypto.timingSafeEqual` pour `CRON_SECRET` | `middleware/auth.js` |
| Password hashing | bcryptjs | `package.json` |
| Input sanitization | DOMPurify | `middleware/inputSanitization.js` |
| Output escaping | html-entities | `middleware/sanitization.js` |
| Sessions | Redis-backed, httpOnly, secure, sameSite | `middleware/session.js` |

**Total : 12 mécanismes de sécurité distincts dans 7 fichiers middleware.**

## 4. Base de données

| Métrique | Valeur | Source |
|----------|--------|--------|
| Tables MySQL | **8** (users, email_verification, packages, words, word_details, learning, user_best_scores, schema_migrations) | `migrations/001_initial.sql` |
| Indexes composites | **6** (dont 2 PK composites + 4 indexes nommés multi-colonnes) | `migrations/001_initial.sql` |
| Normalisation | **3NF** avec FK en CASCADE, contraintes CHECK, ENUM, UNIQUE | `migrations/001_initial.sql` |
| Migrations | Versionnées, exécutées automatiquement au déploiement Docker | `scripts/run-migrations.js` |

## 5. Services externes intégrés

| Service | Usage | Résilience |
|---------|-------|------------|
| Google Gemini | Enrichissement IA des mots (définitions, exemples, contexte) | Batch processing, retry, circuit breaker |
| Google Cloud TTS | Prononciation audio native | Timeout, retry, circuit breaker |
| Google OAuth2 | Authentification tierce | — |
| AWS SES | Envoi d'emails (vérification, rappels, reset password) | Queue RabbitMQ + retry + dead-letter |
| AWS S3 | Backups base de données | Service CRON dédié |

**Total : 5 APIs cloud externes + 3 services d'infrastructure (MySQL, Redis, RabbitMQ).**

## 6. Tests

| Métrique | Valeur | Source |
|----------|--------|--------|
| Fichiers de test Jest | **50** | `__tests__/` |
| Cas de test unitaires | **473** (`it`/`test` blocks) | `__tests__/` |
| Fichiers E2E Playwright | **5** (auth-pages, feedback, login, registre, smoke) | `e2e/` |
| Cas de test E2E | **25** | `e2e/` |
| **Total tests** | **498** | — |
| Lignes de code test | **~7 200** | `__tests__/` + `e2e/` |
| Coverage | Non configuré (pas de `--coverage` dans scripts) | `package.json` |

## 7. Frontend & Gamification

| Métrique | Valeur | Source |
|----------|--------|--------|
| Templates Handlebars | **27** | `app/views/` |
| Fichiers JS frontend | **22** | `public/js/` |
| Fichiers CSS | **20** | `public/css/` |
| Mini-jeux | **7** | `public/js/games/` |
| Lignes JS jeux | **6 183** | `public/js/games/*.js` |
| Assets minifiés (esbuild) | **42** fichiers (22 JS + 20 CSS) | `scripts/build.js` |

### Détail des 7 mini-jeux

| Jeu | Fichier | Lignes |
|-----|---------|--------|
| Flash Match | `flashMatch.js` | 496 |
| Word Scramble | `wordScramble.js` | 520 |
| Vocab Quiz | `vocabQuiz.js` | 702 |
| Speed Vocab | `speedVocab.js` | 727 |
| Phrase Completion | `phraseCompletion.js` | 815 |
| Test Pronun (TTS + Speech Recognition) | `testPronun.js` | 1 388 |
| Word Search | `wordSearch.js` | 1 535 |

## 8. Performance

| Optimisation | Détail | Source |
|-------------|--------|--------|
| Compression HTTP | Gzip/Brotli via `compression` middleware | `appFactory.js` |
| Cache static | `maxAge: 1d` en production, etag, lastModified | `appFactory.js` |
| Minification | esbuild in-place (42 fichiers JS+CSS) | `scripts/build.js` |
| Docker multi-stage | 3 étapes (strip npm/yarn, non-root user) | `Dockerfile` |
| Indexes MySQL | 6 indexes composites pour les requêtes fréquentes | `migrations/001_initial.sql` |
| Batch queries | Opérations batch pour N+1 query fixes | `app/models/learning.js` |
| Lazy loading | Images avec `loading="lazy"` | Templates `.hbs` |
| Temps de réponse prod | **7-16ms** (mesuré par Morgan en production) | Logs Railway |

## 9. Lignes de code

| Catégorie | Lignes |
|-----------|--------|
| JavaScript source (hors tests) | **~19 000** |
| JavaScript tests | **~7 200** |
| Templates Handlebars | **~4 900** |
| CSS | **~35 200** |
| SQL | **~2 300** |
| **Total projet** | **~69 000** |

## 10. Dépendances

| Type | Nombre |
|------|--------|
| dependencies | **28** |
| devDependencies | **12** |
| **Total** | **40** |

---

## Bullet points CV

### Version complète (pour lettre de motivation ou description détaillée)

- **Architecturé et déployé** une infrastructure cloud de 7 services (Web, Worker, Scheduler, MySQL, Redis, RabbitMQ, Backup S3) sur Railway, avec Dockerfile multi-stage 3 étapes et images GHCR
- **Conçu un pipeline CI/CD** de 6 jobs GitHub Actions (lint, audit npm, 498 tests, build Docker, scan Trivy, deploy + E2E Playwright), automatisant entièrement le cycle de déploiement staging → production
- **Développé une API REST** Express.js de 57 endpoints organisés en 20 controllers, 7 models et 6 services, suivant une architecture MVC avec validation centralisée et gestion d'erreurs par classes d'exception
- **Implémenté 12 mécanismes de sécurité** : Helmet CSP strict-dynamic avec nonces, HSTS preload, CSRF double-submit, rate limiting multi-niveaux, bcrypt, OAuth2 Google, sessions Redis et sanitization I/O (DOMPurify)
- **Intégré 5 APIs cloud** (Google Gemini, Cloud TTS, OAuth2, AWS SES, S3) avec patterns de résilience avancés : Timeout, Retry exponential backoff + jitter et Circuit Breaker
- **Conçu un système de messaging asynchrone** RabbitMQ avec 6 queues (main + retry + dead-letter par consumer), un Worker dédié et un Scheduler service avec catch-up Redis
- **Rédigé 498 tests automatisés** (473 Jest + 25 Playwright E2E) répartis dans 50 fichiers, exécutés à chaque push via CI/CD
- **Développé 7 mini-jeux gamifiés** (6 183 lignes JS) intégrant Text-to-Speech, Speech Recognition et un algorithme SRS à 5 niveaux basé sur la courbe de l'oubli
- **Conçu un schéma MySQL normalisé 3NF** de 8 tables avec 6 indexes composites, FK en cascade et migrations versionnées automatiques
- **Optimisé les performances** : compression HTTP, cache static 24h, minification esbuild de 42 assets, batch queries et temps de réponse 7-16ms en production

### Version condensée (pour CV 1 page)

- Architecturé une plateforme EdTech full stack (~19 000 lignes JS) déployée en 7 microservices cloud (Railway), intégrant 5 APIs (Gemini, TTS, OAuth2, SES, S3) avec patterns de résilience (Circuit Breaker, Retry, Timeout)
- Conçu un pipeline CI/CD 6 jobs (lint, 498 tests, Docker build, Trivy scan, deploy, E2E) et 12 mécanismes de sécurité (CSP nonces, CSRF, HSTS, rate limiting, OAuth2, bcrypt)
- Développé 57 endpoints REST, 7 mini-jeux gamifiés avec SRS adaptatif, messaging asynchrone RabbitMQ (6 queues) et schéma MySQL 3NF (8 tables, 6 indexes composites)

### Version ultra-courte (1 ligne)

- Développé en solo une plateforme EdTech full stack Node.js/MySQL (7 microservices, 57 endpoints, 498 tests, 5 APIs cloud, CI/CD 6 jobs) déployée sur Railway
