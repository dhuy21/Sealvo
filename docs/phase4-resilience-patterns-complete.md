# Phase 4 — Resilience Patterns (Timeout, Retry, Circuit Breaker)

Ce document récapitule **tout ce qui a été fait, décidé et validé** pendant la Phase 4 de la compétence **“5. API Design & Error Handling Patterns”**, dans une approche **professionnelle, réaliste et déployable**.

---

## Objectif de la Phase 4

Renforcer la **résilience applicative** face aux pannes/latences des **services externes** les plus critiques, en ajoutant des patterns standard :

- **Timeout** : empêcher une requête externe de bloquer trop longtemps.
- **Retry** (backoff exponentiel + jitter) : récupérer des erreurs transitoires (réseau, 5xx, throttling).
- **Circuit Breaker** : éviter une cascade d’échecs (fail fast) quand un service est KO.

Services ciblés (après analyse du projet) :

- **Google Cloud TTS**
- **Gemini AI**
- **AWS SES via Nodemailer**

---

## Ce qui a été implémenté (livrables)

### 1) Infrastructure réutilisable

**Nouveau fichier** :
- `src/app/core/resilience.js`

Contient :
- **`withTimeout(fn, ms)`** → rejette avec `TimeoutError` après `ms`.
- **`withRetry(fn, { retries, delay, backoff })`** → retry avec backoff exponentiel + jitter (anti “thundering herd”).
- **`CircuitBreaker({ name, threshold, resetTimeout })`** → états `CLOSED`, `OPEN`, `HALF_OPEN`.
- **Erreurs** : `TimeoutError`, `CircuitOpenError` (volontairement **pas** des `AppError`).

**Composition standard validée** :

```
CircuitBreaker → withRetry → withTimeout → appel réel
```

Pourquoi cet ordre :
- Timeout déclenche → retry peut relancer.
- Retry épuisé → circuit breaker comptabilise un échec.
- Circuit ouvert → fail-fast (pas de retry inutile).

---

### 2) Application à Google Cloud TTS

Fichier modifié :
- `src/app/services/google_cloud_tts.js`

Changements :
- Ajout d’un **circuit breaker partagé** (`ttsBreaker`) pour `fetchWavenetVoices` et `synthesize`.
- Wrapping des appels externes :
  - `fetchWavenetVoices(language)` : **timeout 8s**, **2 retries**, breaker **threshold 5**, **open 30s**
  - `synthesize(text, language, voiceName)` : **timeout 5s**, **2 retries**, breaker idem

Décision importante :
- `getClient()` (erreur de configuration/credentials) est **hors** wrapper resilience → **n’ouvre pas** le circuit breaker (correct : ce n’est pas une panne transitoire).

Impact runtime :
- Si TTS est KO : après 5 échecs, les appels échouent **immédiatement** pendant 30s (fail-fast).
- Les erreurs de résilience (`TimeoutError`, `CircuitOpenError`) remontent au pipeline Express et deviennent **500** côté client (message générique), tout en étant loggées côté serveur.

---

### 3) Application à Gemini AI

Fichier modifié :
- `src/app/services/gemini.js`

Changements :
- Ajout d’un circuit breaker partagé (`geminiBreaker`) :
  - **threshold 5**, **open 60s**
- Wrapping :
  - `modifyExample(words)` : **timeout 15s**, **1 retry**, breaker
  - `generateExemple(words)` : **timeout 30s**, **1 retry**, breaker

Décision clé :
- **Fallback préservé** : en cas d’échec (timeout / circuit open / erreurs), Gemini retourne **`[]`**.

Intégration existante observée :
- `src/app/services/wordProcessingService.js` utilise Gemini dans `enrichWithGemini()` et `enrichSingleWord()` avec un comportement “best effort”.
  - Si Gemini échoue : l’app continue (pas de crash, pas de blocage).

---

### 4) Application à Email (AWS SES via Nodemailer)

Fichier modifié :
- `src/app/services/mailersend.js`

Changements :
- Wrapping de `transporter.sendMail()` :
  - **timeout 10s**
  - **2 retries** (3 tentatives total)
- **Fallback préservé** : en cas d’échec total → `sendEmail()` retourne **`false`** (comme avant).

Décision : **pas de Circuit Breaker** sur l’email
- Un email (reset password / vérification) est critique.
- On préfère **tenter** plutôt que fail-fast.
- La file RabbitMQ gère déjà une stratégie de retry différée (voir ci-dessous).

Interaction avec la queue (déjà existant dans le projet) :
- `src/app/queues/emailQueue.js`
  - Retry “queue-level” via DLQ / retry queue (TTL 10s), `MAX_RETRIES = 2`
  - En cas d’échec final : `FAILED_QUEUE`

Note de design (validé) :
- Il y a un **double retry** :
  - **Niveau 1** : retry immédiat (app-level) pour glitch réseau court
  - **Niveau 2** : retry différé (queue-level) pour récupération du service
Ce pattern est courant en production quand l’opération est asynchrone (background).

---

## Flux d’erreur et cohérence avec l’architecture existante

### TTS (API)

Chemin :
- Route API → `asyncHandler()` → `TTSController.generateAudio()` → `google_cloud_tts.js` → erreurs éventuelles
- Erreur → `errorHandler` (`src/app/middleware/errorHandler.js`)

Résultat :
- `TimeoutError` / `CircuitOpenError` **ne sont pas** des `AppError` → traitées comme erreurs “non-opérationnelles” :
  - **HTTP 500**
  - Message générique côté client
  - Log côté serveur via `console.error('[ErrorHandler] Unexpected error:', err)`

### Gemini (enrichissement)

Chemin :
- `wordProcessingService` appelle `geminiService.*` en **best-effort**
- `gemini.js` catch global → retourne `[]`

Résultat :
- Pas de propagation HTTP.
- Dégradation gracieuse : pas d’exemple généré/corrigé, mais workflow continue.

### Email (background)

Chemin :
- Controller → `emailQueue.enqueue()`
  - Si RabbitMQ up : publish + consumer → `MailersendService.sendEmail()`
  - Si RabbitMQ down : fallback direct `MailersendService.sendEmail()`

Résultat :
- `sendEmail()` renvoie `false` si tout échoue, et la queue décide `nack`/DLQ/FAILED_QUEUE.

---

## Tests (ce qui a été ajouté / modifié)

### Nouveaux tests unitaires / intégration “résilience”

Fichiers ajoutés :
- `src/__tests__/unit/resilience.test.js` (14 tests)
- `src/__tests__/unit/ttsServiceResilience.test.js` (4 tests)
- `src/__tests__/unit/geminiServiceResilience.test.js` (5 tests)
- `src/__tests__/unit/emailServiceResilience.test.js` (4 tests)

Fichier modifié :
- `src/__tests__/middleware/errorHandler.test.js`
  - Ajout de tests pour `TimeoutError` et `CircuitOpenError` (mapping en 500 + log serveur + message client générique)

### Résultat final

- **44 suites**
- **431 tests**
- **0 échec**

---

## Scénarios manuels recommandés (validation réaliste)

### TTS
- Générer une prononciation (route API).
- Simuler une panne réseau / latence :
  - Timeout attendu → 500 générique côté client (et log serveur).
  - Après plusieurs erreurs consécutives → circuit breaker OPEN (fail-fast pendant 30s).

### Gemini
- Importer/ajouter des mots sans exemple :
  - Si Gemini OK → exemples générés/corrigés
  - Si Gemini KO → pas de crash, pas d’exemple, workflow continue (fallback `[]`)

### Email
- Déclencher un reset password / vérification email :
  - Si SES KO temporaire → retries
  - Si échec total → `false`, puis retry queue-level si RabbitMQ actif

---

## Points de qualité (Clean code / OOP / Modules)

- **SRP / modularité** : `resilience.js` centralise la résilience, chaque service applique uniquement sa policy.
- **Pas de logique “dump”** : rien n’est déplacé dans un gros fichier, tout reste dans des modules cohérents (`core/`, `services/`, `middleware/`).
- **Cohérence** : TTS propage (service critique), Gemini degrade (best-effort), Email degrade + queue.
- **Aucune contradiction** détectée lors des revues manuelles (y compris cas limites : HALF_OPEN concurrent, timeouts tardifs, exceptions sync).

---

## Recommandations “production-grade” (optionnelles, hors scope Phase 4)

Pour aller encore plus loin comme en prod (sans toucher la logique métier) :

- **Métriques** (Prometheus/Grafana) :
  - `circuit_state`, `circuit_open_total`, `retry_total`, `timeout_total`
- **Logging structuré** (skill dédiée future) :
  - tracer `service`, `attempt`, `timeoutMs`, `circuitState`
- **Configuration par env** :
  - timeouts/retries/breaker via variables d’environnement (pour ajuster sans redeploy)
- **Health endpoint** :
  - exposer l’état des circuit breakers (`/health/deps`)

---

## Fichiers touchés (liste)

- `src/app/core/resilience.js` (NOUVEAU)
- `src/app/services/google_cloud_tts.js` (modifié)
- `src/app/services/gemini.js` (modifié)
- `src/app/services/mailersend.js` (modifié)
- `src/__tests__/unit/resilience.test.js` (NOUVEAU)
- `src/__tests__/unit/ttsServiceResilience.test.js` (NOUVEAU)
- `src/__tests__/unit/geminiServiceResilience.test.js` (NOUVEAU)
- `src/__tests__/unit/emailServiceResilience.test.js` (NOUVEAU)
- `src/__tests__/middleware/errorHandler.test.js` (modifié)

