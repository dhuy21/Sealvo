# Phase 5 — API Design & Error Handling Patterns (résumé complet)

Ce document récapitule **tout ce qui a été fait, décidé, discuté et corrigé** pendant la **Phase 5** de la compétence **« 5. API Design & Error Handling Patterns »** pour le développement fullstack, dans une approche **professionnelle, avancée et déployable**.

---

## 1. Contexte et objectifs de la Phase 5

La Phase 5 prolonge la Phase 4 (Timeout, Retry, Circuit Breaker) en ajoutant :

- **Contrats HTTP cohérents** : les erreurs d’infrastructure (timeout, circuit ouvert) ne renvoient plus un 500 générique mais des codes **504** et **503** avec des messages adaptés.
- **Configuration par environnement** : tous les paramètres de résilience (timeouts, retries, seuils) sont externalisés en variables d’environnement, sans redéploiement.
- **Retry « intelligent »** : ne pas retenter les erreurs non transitoires (4xx, UNAUTHENTICATED, etc.) pour éviter des appels inutiles et des latences.
- **Idempotence email** : anti-duplication des messages email via Redis (SET NX) pour éviter les envois multiples en cas de reprise RabbitMQ.
- **Visibilité opérationnelle** : endpoint `/health/deps` exposant l’état des dépendances (Redis, RabbitMQ) et de tous les circuit breakers.

---

## 2. Plan en 6 étapes (validées une par une)

| Étape | Intitulé | Statut |
|-------|----------|--------|
| 1 | Normaliser les erreurs des dépendances externes (503/504 au lieu de 500) | ✅ |
| 2 | Config des politiques de résilience par environnement (variables d’env) | ✅ |
| 3 | Retry « smart » (filtrer les erreurs non transitoires) | ✅ |
| 4 | Idempotence email (anti-duplication) | ✅ |
| 5 | Endpoint `/health/deps` (état des circuit breakers + infra) | ✅ |
| 6 | Tests + validation finale | ✅ |

Chaque étape a été validée avant de passer à la suivante.

---

## 3. Détail des implémentations

### 3.1 Étape 1 — Normalisation HTTP (504 / 503)

**Fichier modifié :** `src/app/middleware/errorHandler.js`

**Objectif :**  
Ne plus renvoyer 500 pour les erreurs d’infrastructure (timeout, circuit ouvert), mais des codes et messages explicites pour le client et les load balancers.

**Changements :**

- Ajout d’un mapping **par nom d’erreur** (sans importer les classes de `resilience.js`) pour garder un couplage faible :

```javascript
const INFRA_ERRORS = {
  TimeoutError: {
    status: 504,
    message: 'Le service externe ne répond pas. Veuillez réessayer.',
  },
  CircuitOpenError: {
    status: 503,
    message: 'Service temporairement indisponible. Veuillez réessayer dans quelques instants.',
  },
};
```

- Dans le middleware à 4 arguments :
  1. Erreurs **opérationnelles** (`AppError`) → `statusCode` et message existants.
  2. Erreurs **infrastructure** (`err.name` dans `INFRA_ERRORS`) → 504 ou 503 + message client + log serveur.
  3. Autres erreurs → 500 + message générique + log.

- Les détails internes (nom du circuit, durée du timeout) ne sont **jamais** exposés au client (sécurité et simplicité).

**Tests :**  
`src/__tests__/middleware/errorHandler.test.js` — cas TimeoutError → 504, CircuitOpenError → 503, messages et logs.

---

### 3.2 Étape 2 — Configuration par environnement

**Fichier créé :** `src/app/config/resilience.js`

**Objectif :**  
Centraliser et rendre tunables (sans redéploiement) tous les paramètres de résilience (timeouts, retries, seuils de circuit breaker).

**Contenu :**

- Helper **`env(key, fallback)`** qui lit `process.env[key]`, parse en entier, et retourne le `fallback` si la valeur est absente, vide ou non numérique (évite les `NaN` en production).

```javascript
const env = (key, fallback) => {
  const v = process.env[key];
  if (v == null || v === '') return fallback;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
};
```

- Export d’un objet par service :
  - **tts** : `synthesizeTimeout`, `voicesTimeout`, `retries`, `retryDelay`, `breakerThreshold`, `breakerResetTimeout`
  - **gemini** : `modifyTimeout`, `generateTimeout`, `retries`, `retryDelay`, `breakerThreshold`, `breakerResetTimeout`
  - **email** : `timeout`, `retries`, `retryDelay`

Convention de nommage : `SERVICE_PARAM_UNIT` (ex. `TTS_SYNTHESIZE_TIMEOUT_MS`).

**Fichiers modifiés pour consommer la config :**

- `src/app/services/google_cloud_tts.js` — import `cfg` depuis `../config/resilience` (section `tts`), remplacement des constantes en dur.
- `src/app/services/gemini.js` — idem section `gemini`.
- `src/app/services/mailersend.js` — idem section `email`.

**Tests :**  
`src/__tests__/unit/resilienceConfig.test.js` — valeurs par défaut et surcharge par variables d’environnement.

---

### 3.3 Étape 3 — Retry « smart » (filtrer les erreurs non transitoires)

**Fichier modifié :** `src/app/core/resilience.js`

**Objectif :**  
Ne retenter que les erreurs **transitoires** (réseau, 5xx, throttling, timeout). Les erreurs métier ou d’auth (4xx, UNAUTHENTICATED, INVALID_ARGUMENT, etc.) ne doivent pas être retentées.

**Ajouts :**

- **`isTransientError(err)`** — heuristique basée sur :
  - `err.name === 'TimeoutError'`
  - Codes gRPC transitoires (4, 8, 13, 14) : DEADLINE_EXCEEDED, RESOURCE_EXHAUSTED, UNAVAILABLE, etc.
  - HTTP 429 ou 5xx (`err.status` ou `err.statusCode`)
  - Codes réseau Node (`err.code` string) : ECONNRESET, ECONNREFUSED, ETIMEDOUT, EPIPE, EAI_AGAIN, ENOTFOUND

- **`withRetry`** accepte désormais une option **`shouldRetry(err)`** (prédicat). Si fourni, un retry n’a lieu que si `shouldRetry(err)` est vrai. Sinon, comportement inchangé (retry sur toute erreur).

**Utilisation dans les services :**

- TTS, Gemini, Mailersend : `withRetry(..., { ..., shouldRetry: isTransientError })`.

**Tests :**

- `ttsServiceResilience.test.js` : pas de retry sur UNAUTHENTICATED (16), INVALID_ARGUMENT (3) ; retry sur UNAVAILABLE (14).
- `geminiServiceResilience.test.js` : pas de retry sur 403, 400 ; retry sur 503.
- `emailServiceResilience.test.js` : pas de retry sur erreur sans code réseau (ex. MessageRejected) ; retry sur ECONNRESET, ETIMEDOUT.

Les tests utilisent des helpers (`grpcError`, `httpError`, `netError`) pour construire des erreurs réalistes (`.code`, `.status`) afin que `isTransientError` se comporte correctement.

---

### 3.4 Étape 4 — Idempotence email (anti-duplication)

**Objectif :**  
Éviter d’envoyer plusieurs fois le même email en cas de reprise ou de redélivery RabbitMQ, tout en restant tolérant à l’indisponibilité de Redis.

**Fichier modifié :** `src/app/core/cache.js`

- **`setNX(key, value, ttlSeconds)`** : opération atomique Redis `SET key value EX ttl NX`. Retourne `true` si la clé a été créée (première fois), `false` si elle existait déjà ou si Redis est indisponible.

**Fichier modifié :** `src/app/queues/emailQueue.js`

- **À la publication :** chaque message reçoit un `messageId: crypto.randomUUID()` dans les options RabbitMQ.
- **Dans le consumer :**
  - On lit `dedupId = msg.properties.messageId`.
  - **Si** `dedupId` est présent **et** `redisReady()` est vrai → on tente `cache.setNX('email:dedup:' + dedupId, 1, DEDUP_TTL)`.
  - Si `setNX` retourne `false` (vraie duplication) → log warning, `ack` sans envoyer l’email.
  - Si Redis n’est pas prêt → **on ne fait pas** le check dedup ; on envoie l’email (priorité à la livraison plutôt qu’à l’évitement strict des doublons en cas de panne Redis).

**Bug critique corrigé en cours de Phase 5 :**  
Auparavant, quand Redis était down, `setNX` retournait `false` et le code considérait à tort le message comme un doublon, donc **ack sans envoi** → perte d’emails. La correction consiste à n’entrer dans la logique de dedup **que si** `redisReady()` est vrai. Ainsi, en cas d’indisponibilité Redis, on bypasse le dedup et on envoie quand même.

**Tests :**  
`src/__tests__/unit/emailQueueDedup.test.js` — publish avec UUID, doublon skippé, nouveau message traité, **Redis down → email quand même envoyé**, message sans `messageId` traité sans dedup.

**Tests cache :**  
`src/__tests__/unit/cache.test.js` — section `setNX` (Redis down, clé nouvelle, clé existante, Redis qui throw).

---

### 3.5 Étape 5 — Endpoint `/health/deps`

**Fichier créé :** `src/app/routes/health.js`  
**Fichier modifié :** `src/app/core/resilience.js` (registry) et `src/app/routes/index.js` (montage du router).

**Objectif :**  
Exposer un endpoint de santé « détaillé » pour la supervision : état Redis, RabbitMQ, et état de **tous** les circuit breakers enregistrés.

**Registry des circuit breakers :**

- Dans `CircuitBreaker`, registre statique `_registry` (Map). Chaque instance s’enregistre dans le constructeur.
- Méthode statique **`CircuitBreaker.getAll()`** retourne cette Map.

**Route `GET /health/deps` :**

- Construit un objet `breakers` à partir de `CircuitBreaker.getAll()` (pour chaque breaker : `state` via `getState()`, `failureCount`).
- Construit `infra` : `redis`, `rabbitmq` → `'UP'` ou `'DOWN'` selon `redis.isReady()` et `rabbitmq.isReady()`.
- **200** si tous les breakers sont `CLOSED` et toute l’infra est `UP`, sinon **503**.
- Corps JSON : `status` (healthy | degraded), `infra`, `circuitBreakers`, `timestamp`.

**Montage :**  
Dans `routes/index.js`, `app.use('/health', healthRouter)` est en tête des routes pour que `/health/deps` soit accessible sans auth (idéal pour des probes externes).

**Note d’architecture :**  
L’app a déjà `GET /health` dans `appFactory.js` (check DB/Redis/RabbitMQ minimal). `GET /health` et `GET /health/deps` coexistent sans conflit : le premier est un match exact, le second est géré par le router Phase 5.

**Tests :**  
`src/__tests__/unit/healthEndpoint.test.js` — 200 quand tout est OK, 503 si un breaker est OPEN ou si Redis/RabbitMQ est DOWN, 200 quand aucun breaker n’existe et infra UP.

---

### 3.6 Étape 6 — Tests et validation

- **Tests unitaires** : config résilience, cache (dont setNX), errorHandler (503/504), health endpoint, dedup emailQueue, TTS/Gemini/Email avec retry smart et circuit breaker.
- **Scénarios manuels** documentés (ex. Redis down + envoi email, circuit ouvert TTS, etc.) pour valider le comportement en conditions réelles.
- **Revue de code** manuelle (sans s’appuyer uniquement sur les tests) : cohérence architecture, clean code, responsabilité unique, pas de logique inutile.

---

## 4. Bugs identifiés et corrections

### 4.1 Tests « smart retry » (Étape 3)

**Problème :**  
Les mocks d’erreur étaient des `Error` génériques sans `.code` (gRPC) ou `.status` (HTTP). `isTransientError` les classait comme non transitoires → pas de retry → les tests qui attendaient plusieurs appels échouaient.

**Correction :**  
Introduction de helpers dans les tests pour construire des erreurs réalistes :
- **gRPC** : `grpcError(msg, code)` avec `err.code = code`.
- **HTTP** : `httpError(msg, status)` avec `err.status = status`.
- **Réseau** : `netError(msg, code)` avec `err.code = code` (ex. ECONNRESET).

Les tests de retry et de non-retry passent avec le comportement attendu.

---

### 4.2 Dedup email quand Redis est down (Étape 4)

**Problème :**  
Si Redis est indisponible, `cache.setNX()` retourne `false`. Le consumer interprétait ce `false` comme « doublon » et faisait `ack` sans envoyer l’email → **perte d’emails** en cas de panne Redis.

**Correction :**  
Ne faire le check de dedup **que si** Redis est disponible : `if (dedupId && redisReady()) { ... setNX ... }`. Si Redis est down, on ne fait pas de `setNX`, on envoie l’email. On accepte un risque de doublon limité plutôt qu’une perte certaine.

---

### 4.3 Configuration résilience — valeurs env invalides (revue de code)

**Problème :**  
Le helper `env(key, fallback)` faisait `parseInt(v, 10)` sans vérifier les chaînes vides ou non numériques. Si une variable était vide ou mal configurée (ex. `TTS_SYNTHESIZE_TIMEOUT_MS=''` ou `abc`), on obtenait `NaN` → `setTimeout(fn, NaN)` se comporte comme 0 (timeout immédiat), et le circuit breaker ne s’ouvrait pas correctement (seuil `NaN`).

**Correction :**  
- Si `v == null` ou `v === ''` → retourner `fallback`.
- Après `parseInt`, si `Number.isNaN(n)` → retourner `fallback`.

Aucun autre fichier du projet ne contenait ce pattern vulnérable (les autres utilisent `parseInt(...) || default`).

---

## 5. Fichiers créés ou modifiés (référence)

| Fichier | Action | Rôle |
|---------|--------|------|
| `app/middleware/errorHandler.js` | Modifié | Mapping 504/503 par `err.name`, messages client, log infra |
| `app/config/resilience.js` | Créé | Config centralisée, helper `env` sécurisé |
| `app/core/resilience.js` | Modifié | `isTransientError`, `withRetry(..., { shouldRetry })`, registry CircuitBreaker |
| `app/core/cache.js` | Modifié | `setNX` pour dedup atomique |
| `app/queues/emailQueue.js` | Modifié | `messageId` UUID, dedup avec guard `redisReady()` |
| `app/routes/health.js` | Créé | GET `/health/deps` |
| `app/routes/index.js` | Modifié | Montage du router health |
| `app/services/google_cloud_tts.js` | Modifié | Config + `shouldRetry: isTransientError` |
| `app/services/gemini.js` | Modifié | Idem |
| `app/services/mailersend.js` | Modifié | Idem |
| `__tests__/middleware/errorHandler.test.js` | Modifié | Cas 504/503, messages, logs |
| `__tests__/unit/resilienceConfig.test.js` | Créé | Defaults et overrides env |
| `__tests__/unit/cache.test.js` | Modifié | Tests setNX |
| `__tests__/unit/emailQueueDedup.test.js` | Créé | Dedup + Redis down |
| `__tests__/unit/healthEndpoint.test.js` | Créé | 200/503, breakers, infra |
| `__tests__/unit/ttsServiceResilience.test.js` | Modifié | Smart retry (gRPC) |
| `__tests__/unit/geminiServiceResilience.test.js` | Modifié | Smart retry (HTTP) |
| `__tests__/unit/emailServiceResilience.test.js` | Modifié | Smart retry (réseau) |

---

## 6. Chaîne d’erreurs et comportement côté client

- **TTS (API)** : Les erreurs Timeout/CircuitOpen remontent jusqu’au middleware d’erreur → 504 ou 503 en JSON. Le frontend (`learnVocabs.js`) fait un `fetch` vers `/api/tts/generate` ; si `!response.ok`, il restaure le bouton (pas de message détaillé affiché à l’utilisateur, mais pas de crash).
- **Gemini** : Les erreurs sont capturées dans le service (try/catch) et dégradées en `[]` ; pas de propagation vers le errorHandler. Comportement voulu (enrichissement non critique).
- **Email** : En cas d’échec d’envoi dans le consumer, retry via DLQ RabbitMQ puis envoi vers `email.failed` après seuil ; pas d’erreur HTTP directe pour l’utilisateur qui a déclenché l’envoi (réponse 200/202 côté API selon le flux).

---

## 7. Points clarifiés avec vous (questions / réponses)

- **Scénario 1 (health/deps)** : Comportement observé (200/503, champs `infra`, `circuitBreakers`) correspond au design : utile pour les load balancers, le monitoring et le debug opérationnel.
- **emailQueue vs Redis Pub/Sub** :  
  - **RabbitMQ (emailQueue)** : file de messages persistante pour l’envoi d’emails et les jobs d’import ; retry, DLQ, dedup.  
  - **Redis Pub/Sub** : utilisé pour les **événements de progression de jobs** (ex. import) en temps réel vers le client (SSE), pas pour la file email.
- **Scénario 8 (Redis down + envoi email)** : Le fait de pouvoir « envoyer » alors que Redis est down correspond au correctif : on bypasse le dedup et on envoie quand même. Si vous aviez vu un envoi réussi alors qu’un bug existait encore, causes possibles : Redis revenu très vite (Docker), ou vérification du code HTTP côté client plutôt que de la réception réelle de l’email.
- **Production / staging (Railway)** : Les pannes de services (Redis, RabbitMQ, etc.) sont rares mais possibles ; les scénarios « service down » restent pertinents pour valider la dégradation gracieuse et éviter les pertes de données (d’où l’importance du correctif dedup + Redis).

---

## 8. Critères de qualité vérifiés (revue manuelle)

- **Correctitude et complétude** : Comportement conforme au plan des 6 étapes et aux correctifs décrits ci-dessus.
- **Clean code / OOP / modularité** : Un fichier = une responsabilité claire ; pas de grosse masse de logique dans un seul fichier ; usage de primitives réutilisables (resilience, cache, config).
- **Cohérence d’architecture** : errorHandler ne dépend pas des classes resilience (mapping par `err.name`) ; health et routes existantes coexistent ; services utilisent la même config et les mêmes primitives.
- **Pas de code superflu** : Corrections ciblées, pas de génération de code inutile ; réutilisation du code existant (redis.isReady, cache, rabbitmq, etc.).

---

## 9. Synthèse

La Phase 5 ajoute à l’application :

1. **Contrats HTTP clairs** pour les erreurs d’infrastructure (504/503).
2. **Configuration par environnement** pour toute la résilience, avec validation des valeurs (pas de NaN).
3. **Retry intelligent** qui évite de retenter les erreurs non transitoires.
4. **Dedup email** robuste avec dégradation gracieuse si Redis est indisponible.
5. **Endpoint `/health/deps`** pour la supervision (infra + circuit breakers).

Les bugs critiques (perte d’emails quand Redis est down, config env invalide) ont été identifiés et corrigés. Les tests automatisés et la revue de code manuelle confirment que l’ensemble est cohérent, maintenable et prêt pour un déploiement de type production.

Ce fichier sert de **référence unique** pour tout ce qui a été fait, convenu et résolu jusqu’à la fin de la Phase 5 de la compétence « 5. API Design & Error Handling Patterns ».
