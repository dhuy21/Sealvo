# Competence 4 : Background Jobs & Task Queues (RabbitMQ + Redis)

## Synthese complete et detaillee — Phase 1, Phase 2, Phase 2 supplementaire et Phase 3

> Document genere a partir de l'integralite des discussions, brainstormings, implementations,
> audits et corrections effectues dans la conversation de reference.

---

## Table des matieres

1. [Qu'est-ce que cette competence ?](#i-quest-ce-que-cette-competence-)
2. [Contexte du projet avant cette competence](#ii-contexte-du-projet-avant-cette-competence)
3. [Phase 1 — Email Queue (Infrastructure de base)](#iii-phase-1--email-queue-infrastructure-de-base)
4. [Brainstormings et discussions entre Phase 1 et Phase 2](#iv-brainstormings-et-discussions-entre-phase-1-et-phase-2)
5. [Phase 2 — Multi-queue + Import lourd + Job tracking + SSE](#v-phase-2--multi-queue--import-lourd--job-tracking--sse)
6. [Audits Phase 2 (6 passes)](#vi-audits-phase-2-6-passes)
7. [Phase 2 supplementaire — Streak + UX + Clean Code](#vii-phase-2-supplementaire--streak--ux--clean-code)
8. [Audit Phase 2 supplementaire (3 passes)](#viii-audit-phase-2-supplementaire-3-passes)
9. [Evolution architecturale du projet](#ix-evolution-architecturale-du-projet)
10. [Fichiers crees et modifies](#x-fichiers-crees-et-modifies)
11. [Totalite des bugs trouves et corriges](#xi-totalite-des-bugs-trouves-et-corriges)
12. [Principes et bonnes pratiques respectes](#xii-principes-et-bonnes-pratiques-respectes)
13. [Ce que font les professionnels en production](#xiii-ce-que-font-les-professionnels-en-production)
14. [Etat final (Phase 1 + Phase 2)](#xiv-etat-final)
15. [Phase 3 — Deployment Production + CI/CD Worker](#xv-phase-3--deployment-production--cicd-worker)

---

## I. Qu'est-ce que cette competence ?

**Background Jobs & Task Queues** consiste a deplacer les operations longues ou non-critiques
**hors du cycle requete-reponse HTTP** en les envoyant dans un message broker (RabbitMQ),
pour qu'un worker les traite en arriere-plan.

### Pourquoi c'est essentiel pour un fullstack developer ?

| Probleme sans cette competence | Solution avec cette competence |
|---|---|
| L'utilisateur attend 30s-2min pendant un import Excel + IA | Le serveur repond en < 200ms, le worker traite en arriere-plan |
| Si l'envoi d'email echoue → erreur 500 pour l'utilisateur | L'email est dans la queue, retry automatique, l'utilisateur ne voit rien |
| Un traitement lourd bloque tout le serveur | Le worker tourne dans un process separe, scalable independamment |
| Si le serveur redemarre pendant un traitement → donnees perdues | Les messages persistent dans RabbitMQ, repris automatiquement |

### Pourquoi RabbitMQ et pas BullMQ ?

**Decision prise lors du brainstorming** : RabbitMQ a ete choisi car c'est une competence
**transferable** vers Python (Celery), Java (Spring AMQP), Go, et les architectures
microservices. BullMQ est specifique a Node.js. RabbitMQ est un standard industriel.

---

## II. Contexte du projet avant cette competence

Le projet SealVo est une plateforme d'apprentissage de vocabulaire avec :
- **6 points d'envoi d'email synchrones** (inscription, verification, reset password, rappels)
- **Import Excel + enrichissement Gemini AI** (30s-2min pour 50 mots) — synchrone, bloquant
- **Ajout de mots via formulaire + Gemini** (2-15s) — synchrone
- **TTS via Google Cloud** — deja optimise par cache Redis (TTL 24h)

Competences deja validees : Git+GitHub, ESLint+Prettier, Jest+Supertest, E2E Playwright,
CI/CD GitHub Actions, Docker (Phase 1-4), Database Management (Phase 1-2), Caching Strategy Redis.

---

## III. Phase 1 — Email Queue (Infrastructure de base)

### Objectif

Deplacer **tous les envois d'email** du cycle HTTP synchrone vers une queue RabbitMQ
avec traitement asynchrone par un worker separe.

### Ce qui a ete implemente

#### 1. Module RabbitMQ (`src/app/core/rabbitmq.js`)
- Connexion via `amqplib` avec support URL ou variables individuelles
- Confirm channel avec `prefetch(1)` (un message a la fois)
- Gestion evenements : `error`, `close` sur connection et channel
- API : `connect()`, `getChannel()`, `isReady()`, `disconnect()`

#### 2. Email Queue (`src/app/queues/emailQueue.js`)
- **Exchange** `email.direct` (direct, durable)
- **Queue** `email.send` (durable, DLX vers `email.retry.direct`)
- **Queue** `email.retry` (TTL 10s, DLX retour vers `email.direct`)
- **Queue** `email.failed` (stockage permanent des echecs — dead letter queue)
- `MAX_RETRIES = 2` — apres 2 echecs, message envoye en DLQ
- `enqueue(to, subject, html)` — fire-and-forget
- `startConsumer()` — consomme et appelle `MailersendService.sendEmail()`

#### 3. Pattern de retry avec Dead Letter Exchange (DLX)
```
Message echoue → DLX vers email.retry (TTL 10s)
                → Expire → revient dans email.send
                → Re-echoue (retry_count >= MAX_RETRIES)
                → DLX vers email.failed (stockage permanent)
```

#### 4. Graceful Degradation
- Si RabbitMQ est down → **fallback synchrone** direct (`sendEmail()`)
- L'application ne casse jamais — seulement perte de la resilience async

#### 5. Worker separe (`src/worker.js`)
- Process Node.js independant du web server
- Se connecte a RabbitMQ, configure la topologie, demarre les consumers
- Scalable via `docker compose up --scale worker=3`

#### 6. Integration Docker
- Service `rabbitmq` dans `docker-compose.yml` (image `rabbitmq:3-management-alpine`)
- Management UI sur port `15672`
- Health check integre

#### 7. Les 6 points d'envoi d'email migres

| Point d'envoi | Fichier | Avant | Apres |
|---|---|---|---|
| Inscription (email verification) | `registre.js` | `sendEmail()` synchrone | `emailQueue.enqueue()` |
| Re-envoi verification | `registre.js` | Synchrone | Async |
| Mot de passe oublie | `auth.js` | Synchrone | Async |
| Confirmation reset password | `auth.js` | Synchrone | Async |
| Reminder quotidien (cron) | `ReminderController.js` | Synchrone | Async |
| Email de test | `ReminderController.js` | Synchrone | Async |

### Tests unitaires Phase 1
- `rabbitmq.test.js` — connect, disconnect, isReady, getChannel
- `emailQueue.test.js` — topologie, publish, consumer, retry, DLX, fallback

### Discussion : `docker compose up --scale worker=3`
**Question posee** : "D'ou vient cette commande et comment ca fonctionne ?"

**Reponse** : Docker Compose cree 3 containers du service `worker`, chacun avec un nom
unique (`worker-1`, `worker-2`, `worker-3`). Chaque container se connecte au meme RabbitMQ.
Avec `prefetch(1)`, RabbitMQ distribue les messages de maniere round-robin entre les 3 workers.
C'est du load balancing automatique.

---

## IV. Brainstormings et discussions entre Phase 1 et Phase 2

### Brainstorming 1 : Analyse des 3 operations lourdes

**Question** : Quelles operations devraient etre migrees vers des background jobs ?

| Operation | Duree | Decision | Raison |
|---|---|---|---|
| **Import Excel + Gemini AI** | 30s-2min (50 mots) | **OUI → Queue** | Candidat ideal, bloque HTTP |
| **Ajout mot + Gemini** | 2-15s (1-5 mots) | **OUI si >= 3 mots** | Meme pipeline, seuil configurable |
| **TTS Generation** | 1-3s (cache miss) | **NON** | Cache Redis resout le probleme, la reponse HTTP EST l'audio |

**Pourquoi TTS ne convient pas** : Si on met le TTS en background, l'utilisateur clique "Play"
et recoit un `jobId` au lieu de l'audio. Il faudrait changer completement l'UX. Le cache Redis
(TTL 24h) resout deja le probleme — apres le premier appel, tout est instantane.

### Brainstorming 2 : Pourquoi Redis pour le job tracking ?

**Question** : "Pourquoi utiliser Redis et pas MySQL ou RabbitMQ pour stocker l'etat des jobs ?"

**4 options analysees** :

| Option | Latence | TTL natif | Cross-process | Verdict |
|---|---|---|---|---|
| **MySQL** | 5-50ms | Non | Oui | Overkill pour des donnees ephemeres |
| **RabbitMQ** | N/A | Non | Complexe | Pas un key-value store |
| **In-memory** | 0ms | Non | **Non** | Worker et web app sont des processes separes |
| **Redis** | <1ms | **Oui** | **Oui** | **Parfait** — rapide, partage, TTL auto |

**Conclusion** : Redis est le pont naturel entre worker et web app. Les frameworks professionnels
(BullMQ, Sidekiq, Celery, Laravel Horizon) utilisent tous Redis pour le job tracking.

**Analogie** :
- **RabbitMQ** = transport de messages ("fais ceci")
- **Redis** = etat temporaire partage ("ou en est-ce ?")
- **MySQL** = donnees permanentes ("voici le resultat")

### Brainstorming 3 : Polling vs SSE vs WebSocket

**Question** : "Qu'est-ce que le polling et y a-t-il d'autres methodes ?"

**5 methodes analysees** :

| Methode | Temps reel | Direction | Complexite | Adapte a notre cas |
|---|---|---|---|---|
| **Short Polling** | Non (delai=interval) | Client → Server | Tres simple | Fonctionne mais gaspille |
| **Long Polling** | Quasi | Client → Server | Moyenne | Possible mais degrade |
| **SSE** | **Oui** | **Server → Client** | **Simple** | **Ideal** |
| **WebSocket** | Oui | Bidirectionnel | Complexe | Overkill |
| **Webhook** | Oui | Server → Server | N/A | Impossible pour un browser |

**Decision** : **SSE + Redis Pub/Sub** — architecture 100% event-driven :
- Le worker publie un evenement quand il met a jour la progression
- Le SSE endpoint s'abonne a cet evenement
- Le browser recoit les updates instantanement
- **Zero polling nulle part**

**Exemples d'entreprises utilisant SSE** :
- GitHub (notifications, logs CI/CD)
- ChatGPT/Claude (streaming de reponses token par token)
- Vercel/Railway (logs de build en temps reel)

### Brainstorming 4 : Pourquoi Redis + SSE ? Sont-ils redondants ?

**Question** : "Si j'ai SSE, pourquoi encore besoin de Redis ?"

**Reponse** : Redis et SSE resolvent **deux problemes differents** :

```
Worker ────Redis────→ Web App ────SSE────→ Browser
(process A)   (pont)   (process B)  (push)  (client)
```

| Fosse | Probleme | Solution |
|---|---|---|
| Worker → Web App | Processes separes, pas de memoire partagee | **Redis** (stockage partage + Pub/Sub) |
| Web App → Browser | Le serveur ne peut pas contacter le client spontanement | **SSE** (push serveur → client) |

Avec **Redis Pub/Sub**, le flux est 100% evenementiel :
```
Worker → PUBLISH → Redis Pub/Sub → NOTIFY → Web App SSE → PUSH → Browser
         (instant)                  (instant)               (instant)
```

---

## V. Phase 2 — Multi-queue + Import lourd + Job tracking + SSE

### Objectif

Gerer les **operations lourdes** (import Excel 50+ mots + enrichissement Gemini AI = 30s-2min)
en arriere-plan avec suivi de progression en temps reel via SSE + Redis Pub/Sub.

### Architecture implementee

```
┌─────────────────────────────────────────────────────────────────┐
│                        WEB SERVER (Express)                     │
│                                                                 │
│  Controller → Service → emailQueue.enqueue() ──────────────┐    │
│                       → importQueue.publish() ─────────┐   │    │
│                       → jobTracker.create()            │   │    │
│                                                        │   │    │
│  SSE endpoint ← Redis Pub/Sub ← jobTracker.update()   │   │    │
│       ↓                                                │   │    │
│    Browser (EventSource)                               │   │    │
└────────────────────────────────────────────────────────│───│────┘
                                                         │   │
┌────────────────────────────────────────────────────────│───│────┐
│                     RABBITMQ BROKER                    │   │    │
│                                                        ▼   ▼    │
│  email.direct ──→ email.send ──→ email.retry ──→ email.failed   │
│  import.direct ──→ import.process ──→ import.retry ──→ import.failed │
└─────────────────────────────────────────────────────────────────┘
                         │                    │
                         ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     WORKER (process separe)                     │
│                                                                 │
│  emailQueue.startConsumer() → MailersendService.sendEmail()     │
│  importQueue.startConsumer() → wordProcessingService.processWords()│
│                                    ↓                            │
│                              jobTracker.update() → Redis Pub/Sub│
└─────────────────────────────────────────────────────────────────┘
```

### Implementation detaillee

#### 1. Import Queue (`src/app/queues/importQueue.js`)
- Exchange `import.direct` + retry exchange `import.retry.direct`
- Queue `import.process` (DLX vers retry)
- Queue `import.retry` (TTL 30s, DLX retour vers exchange principal)
- Queue `import.failed` (dead letter permanente)
- `MAX_RETRIES = 1`
- `parseExcelFile(buffer)` — parsing Excel avec `xlsx` + guard fichier vide
- `publish(payload)` — publie `{jobId, wordsData, packageId, userId}`
- `startConsumer()` — delegue a `processWords()` avec callbacks `onPhase`/`onProgress`
- Gestion robuste des erreurs channel (try/catch interne sur `ch.ack`/`ch.nack`)
- Protection du success-path : `ch.ack()` isole pour ne pas ecraser le statut "completed"

#### 2. Job Tracker (`src/app/core/jobTracker.js`)
- Stockage etat des jobs dans Redis avec TTL (1h)
- `create(type, meta)` — cree un job avec ID unique + PUBLISH Pub/Sub
- `get(id)` — recupere l'etat d'un job
- `update(id, fields)` — SET Redis + PUBLISH Pub/Sub (fire-and-forget)
- `remove(id)` — supprime le job et nettoie le set utilisateur (avec `await sRem`)
- `getActiveByUser(userId)` — liste les jobs actifs d'un utilisateur
- Canal Pub/Sub : `job-events:{jobId}`

#### 3. Redis Subscriber (`src/app/core/redis.js`)
- `createSubscriber()` — cree un client Redis dedie via `client.duplicate()`
- Necessaire car Redis Pub/Sub requiert une connexion dediee
  (un client en mode subscriber ne peut plus executer GET/SET)

#### 4. SSE Controller (`src/app/controllers/apiControllers/JobController.js` puis `src/app/routes/api.js`)
- `GET /api/jobs/active` — liste les jobs actifs de l'utilisateur
- `GET /api/jobs/:id` — detail d'un job (avec verification proprietaire deny-by-default)
- `GET /api/jobs/:id/stream` — **Server-Sent Events** :
  - Headers SSE : `Content-Type: text/event-stream`, `Cache-Control: no-cache`,
    `Connection: keep-alive`, `X-Accel-Buffering: no`
  - Envoie l'etat initial du job immediatement
  - Cree un subscriber Redis dedie
  - Pattern **subscribe-then-check** : apres le subscribe, re-verifie l'etat
    (contre la race condition ou le job complete avant le subscribe)
  - Transmet chaque mise a jour en temps reel
  - `try/catch` sur `res.write()` (protection contre deconnexion client)
  - Ferme proprement a la fin (completed/failed) ou deconnexion client
  - Cleanup : unsubscribe + quit subscriber Redis

#### 5. Word Processing Service (`src/app/services/wordProcessingService.js`)
Point unique de verite pour le pipeline de traitement des mots :
- `enrichWithGemini(words)` — Gemini AI pour generer/corriger les exemples
- `enrichSingleWord(wordData)` — enrichissement d'un mot unique (pour edit)
- `saveWords(words, packageId, userId, callbacks)` — validation + INSERT DB
- `processWords(words, packageId, userId, callbacks)` — orchestration complete :
  enrichment → save → cache invalidation, avec callbacks `onPhase`/`onProgress`
- `validateWords(words)` — verification fail-fast : champs requis, types ENUM valides
- `formatValidationErrors(errors)` — formatage erreurs groupees par type

#### 6. Import File Service refactore (`src/app/services/importFile.js`)
- Flux : Upload Multer → Parse Excel → Supprimer fichier temp → Valider → Publier en queue
- Si RabbitMQ down : fallback synchrone avec `processWords()` direct
- Le fichier est **supprime immediatement** apres parsing (securite)
- Nettoyage job orphelin si `publish()` echoue apres `create()`

#### 7. WordController refactore (`src/app/controllers/WordController.js`)
- `addWordPost` : si >= `BULK_THRESHOLD` (3) mots ET RabbitMQ dispo → publie job (HTTP 202)
- Sinon → traitement synchrone via `processWords()`
- `editWordPost` : utilise `enrichSingleWord()` du service (pas d'import direct de `geminiService`)
- Catch renvoie du JSON (pas du HTML) pour compatibilite avec le frontend fetch()
- Nettoyage job orphelin si `publish()` echoue apres `create()`

#### 8. Frontend — Job Watcher (`src/public/js/jobWatcher.js`)
- IIFE encapsule (pas de pollution globale)
- `watchJob(jobId)` — cree un EventSource SSE vers `/api/jobs/:id/stream`
- Affiche notifications de progression :
  "Preparation..." → "Analyse IA..." → "Enregistrement X%" → "Termine"
- Persiste les jobs actifs dans `localStorage` (cle `activeJobs`)
- `resumeActiveJobs()` — au chargement, verifie `/api/jobs/active` et reprend le suivi
- Gestion bfcache : `pageshow` → reload si retour navigateur
- API globale : `window.JobWatcher = { addJob, removeJob }`

#### 9. Frontend — addWord.js (`src/public/js/addWord.js`)
- `watchJob(jobId)` — fonction SSE integree pour suivre la progression
- `handleImportSubmit` : detecte `result.async === true` → appelle `watchJob(result.jobId)`
- `handleMultiWordFormSubmit` : meme gestion async
- Si la reponse est synchrone (fallback) → affichage classique

#### 10. Notification multilignes (`src/public/js/notification.js`)
- Support `\n` → `<br>` pour afficher les erreurs de validation detaillees
- Duree configurable (10s pour les erreurs, 5s pour les succes)

### Concepts appris dans Phase 2

| Concept | Detail |
|---|---|
| **Multi-queue architecture** | 2 types de queues (email + import) avec des topologies separees |
| **Job Status Tracking** | Redis comme pont entre worker et web app, TTL auto 1h |
| **HTTP 202 Accepted** | Le code HTTP correct pour "requete acceptee mais pas encore traitee" |
| **Progress reporting** | Phases (parsing → gemini → saving) + compteurs (15/50) |
| **SSE (Server-Sent Events)** | Protocole HTTP standard unidirectionnel, zero lib |
| **Redis Pub/Sub** | Communication event-driven inter-processus |
| **Subscribe-then-check** | Pattern anti-race condition pour Pub/Sub |
| **Client subscriber dedie** | `duplicate()` — contrainte architecturale Redis |
| **Graceful degradation bidirectionnel** | Async si RMQ dispo, sync si RMQ down |
| **Fail-fast validation** | Verifier tout avant de traiter, erreurs detaillees immediates |
| **Service Layer / SRP** | Point unique de verite pour la logique metier |
| **DRY (Don't Repeat Yourself)** | Elimination de la triple duplication du pipeline Gemini |

---

## VI. Audits Phase 2 (6 passes)

L'utilisateur a demande **6 audits successifs** du code Phase 2 avec des angles differents.
Voici la totalite des bugs trouves et corriges :

### Passe 1 — Audit initial
| # | Severite | Fichier | Bug | Fix |
|---|----------|---------|-----|-----|
| 1 | CRITIQUE | `docker-compose.yml` | Fichier Excel inaccessible par le worker (filesystems isoles) | Volume Docker partage `uploads_data` |
| 2 | CRITIQUE | `api.js` | Race condition SSE (evenement "completed" perdu entre GET et SUBSCRIBE) | Pattern subscribe-then-check |
| 3 | MOYEN | `jobTracker.js` | PUBLISH failure ecrase le resultat de SET | PUBLISH en fire-and-forget `.catch(() => {})` |
| 4 | MOYEN | `api.js` | `res.write()` crash apres deconnexion client | `try/catch` sur `res.write()` |
| 5 | MOYEN | `api.js` | Header `X-Accel-Buffering` manquant pour reverse proxy | Ajout du header |
| 6 | MOYEN | `importFile.js` + `importQueue.js` | Duplication `parseExcelFile` (2 copies differentes) | Export unique depuis `importQueue`, import dans `importFile` |

### Passe 2 — Architecture et SRP
| # | Severite | Fichier | Bug | Fix |
|---|----------|---------|-----|-----|
| 7 | CRITIQUE | `importQueue.js` + `importFile.js` + `WordController.js` | Triple duplication du pipeline Gemini→validate→save | Creation de `wordProcessingService.js` avec `processWords` unique |

### Passe 3 — Couverture frontend
| # | Severite | Fichier | Bug | Fix |
|---|----------|---------|-----|-----|
| 8 | CRITIQUE | `WordController.js` | `editWordPost` crash — `geminiService` non importe apres refactoring | Creation de `enrichSingleWord` dans le service |
| 9 | HAUTE | `addWord.js` | Frontend affiche "succes" immediat sur reponse 202 sans suivre le job | Ajout `watchJob()` avec SSE |
| 10 | HAUTE | `PackageController.js` | `copyPackagePost` renvoie `packageId: undefined` | Correction `newPackage` au lieu de `.package_id` |
| 11 | MOYEN | `importQueue.js` | Cache invalidation dupliquee avec `processWords` | Suppression, delegation complete a `processWords` via `onPhase` |
| 12 | BAS | `importFile.js` | Double `require('../queues/importQueue')` | Merge en un seul import |

### Passe 4 — Bug silencieux Gemini
| # | Severite | Fichier | Bug | Fix |
|---|----------|---------|-----|-----|
| 13 | MOYEN | `gemini.js` | `replaceExample` casse quand 1 seul mot et `words` est un array | `Array.isArray()` + boucle unique |

### Passe 5 — Contrats d'interface et robustesse
| # | Severite | Fichier | Bug | Fix |
|---|----------|---------|-----|-----|
| 14 | MOYEN | `WordController.js` | Catch renvoie HTML (`res.render`) au lieu de JSON | `res.status(500).json(...)` |
| 15 | BAS-MOYEN | `worker.js` | Pas de force exit timer dans `gracefulShutdown` | Ajout `setTimeout(..., 10000).unref()` |
| 16 | MOYEN | `gemini.js` | `===` strict pour comparer IDs (Gemini peut renvoyer string) | Remplace par `==` (coercition de type) |

### Passe 6 — Flux de donnees end-to-end et securite
| # | Severite | Fichier | Bug | Fix |
|---|----------|---------|-----|-----|
| 17 | CRITIQUE | `importQueue.js` + `emailQueue.js` | Consumer crash si channel RabbitMQ meurt (catch block utilise `ch.ack` sur channel mort) | `try/catch` interne dans les catch blocks |
| 18 | MOYEN | `api.js` | Ownership check trop permissif (`&&` au lieu de deny-by-default) | Logique inversee avec `!job.meta?.userId \|\| ...` |
| 19 | MOYEN | `WordController.js` + `importFile.js` + `jobTracker.js` | Job orphelin dans Redis quand publish echoue apres create | Ajout `jobTracker.remove()` + nettoyage en cas d'echec |
| 20 | MOYEN | `importQueue.js` | `ch.ack()` du success-path peut ecraser le statut "completed" si channel meurt | `ch.ack()` isole dans son propre try/catch |

### Passe 6 — Bug additionnel
| # | Severite | Fichier | Bug | Fix |
|---|----------|---------|-----|-----|
| 21 | MOYEN | `importQueue.js` | `parseExcelFile` crash sur fichier Excel vide (`data[0]` undefined) | Guard `if (!data.length) return []` |

### Signalement hors scope : IDOR pre-existant
L'audit a aussi revele un probleme **pre-existant** (pas lie a Phase 2) :
aucune verification d'ownership sur les packages dans `WordController`.
Signale pour correction future.

---

## VII. Phase 2 supplementaire — Streak + UX + Clean Code

### Objectif

Refactorer le mecanisme de streak, ameliorer l'experience d'apprentissage sur la page
"Apprendre", et nettoyer l'architecture frontend (CSS extraction, dead code).

### 7.1 Streak Service (`src/app/services/streakService.js`)

**Avant** : La logique streak etait dans `home.js` (frontend, timer global) —
pas de separation des responsabilites, pas de detection de streak break.

**Apres** : Module backend dedie avec :
- `recordActivity(userId)` — logique complete :
  - Premier jour → streak = 1
  - Jour consecutif → streak + 1
  - Jour manque → **reset a 1** (detection de break via `diffDays`)
  - Meme jour → pas de mise a jour (deduplication)
- `toDateOnly(date)` — normalisation des dates pour comparaison jour-a-jour
- Invalidation cache dashboard apres mise a jour
- `LearningController.js` simplifie : delegue entierement a `streakService`
- `home.js` nettoye : toute la logique streak supprimee

### 7.2 Page "Apprendre" — Evolution des boutons

| Version | Bouton 1 | Bouton 2 | Bouton 3 | Raison du changement |
|---|---|---|---|---|
| v1 (original) | "Je ne sais pas" | "Incertain" | "Je sais" | Pas adapte a l'evaluation |
| v2 | "A revoir" | "Pas encore" | "Appris" | Labels corrects pour l'evaluation |
| v3 | "A revoir" | "Passer" | "Appris" | "Passer" pour ne pas juger |
| **v4 (final)** | **"A revoir"** | *(supprime)* | **"Appris"** | "Passer" redondant avec ← → |

**Logique des 2 boutons finaux** :

| Bouton | `data-level` | Effet sur `progress[i]` | Effet sur barre | Animation |
|---|---|---|---|---|
| **A revoir** | `0` | Mis a 0 | Aucun | Shake (wrong-answer) |
| **Appris** | `2` | Mis a 2 | +1 mot maitrise | Scale up (correct-answer) |
| Navigation ← → | — | Aucun | Aucun | Slide |

**Raccourcis clavier** : `1` = A revoir, `2` = Appris, `←→` = naviguer, `Espace` = retourner la carte

### 7.3 Panel "A revoir" avec navigation directe

- Affiche uniquement les mots marques "A revoir" (level 0)
- Chips rouges cliquables → navigation directe vers la carte
- Disparait quand aucun mot n'est "A revoir"
- Support dark mode (fond semi-transparent rouge, texte `#f87171`)

### 7.4 Declenchement du streak

- Le streak ne se declenche que quand **tous les mots** sont marques "Appris"
  (`progress.every(p => p === 2)`)
- Variable `streakRecorded` empeche les doublons dans la meme session
- Appel API `POST /api/learning/streak` → `streakService.recordActivity()`

### 7.5 Auto-save et suppression du bouton Sauvegarder

- **Bouton "Sauvegarder" supprime** du HTML
- **Auto-save silencieux** : `saveProgress()` appele dans `updateProgressDisplay()`
- `loadProgress()` au chargement restaure l'etat depuis `localStorage`

### 7.6 Extraction CSS des fichiers JS

| Fichier JS | Lignes CSS retirees | Fichier CSS cible |
|---|---|---|
| `learnVocabs.js` | ~65 lignes (animations, remaining words panel) | `learnVocabs.css` + `dark-mode.css` |
| `vocabs.js` | ~90 lignes (edit-input, alerts, animations) | `styleVocabs.css` |
| `speedVocab.js` | ~10 lignes (screenShake keyframe) | `games/speedVocab.css` |

**Resultat** : 0 `createElement('style')` dans tous les fichiers JS.

### 7.7 Suppression du son flip card

- `new Audio('/sounds/flip.mp3')` retiree de `learnVocabs.js` (causait des 404)

---

## VIII. Audit Phase 2 supplementaire (3 passes)

### Bugs trouves et corriges

| # | Severite | Fichier | Bug | Fix |
|---|----------|---------|-----|-----|
| 22 | MOYEN | `home.js` | Selecteur `.hero-banner` → template utilise `.hero-section` | Corrige en `.hero-section` |
| 23 | MOYEN | `home.js` | 3 fonctions mortes (`animateCounters`, `initStaggeredAnimations`) — ciblent des elements supprimes | Fonctions et appels supprimes |
| 24 | MOYEN | `importQueue.js` | Dead code `filePath` (branches et import `fs` inutilises) | Branches et import supprimes |
| 25 | MOYEN | `jobTracker.js` | Race condition `sRem` fire-and-forget dans `remove()` | `await client.sRem(...)` avant `del` |
| 26 | BAS | `importQueue.test.js` | Mock orphelin `jest.mock('fs')` | Supprime |
| 27 | BAS | `learnVocabs.js` | Commentaire obsolete `1: uncertain` | Mis a jour : `-1: unseen, 0: a revoir, 2: appris` |

---

## IX. Evolution architecturale du projet

### Brainstorming : "Mon projet n'est plus MVC ?"

**Question posee** : "Si j'ai des services, des queues et des workers, c'est encore du MVC ?"

**Reponse** : Le projet a evolue vers une **Layered Architecture with Service Layer** :

```
╔══════════════════════════════════════════════════════════════╗
║  COUCHE 1 — PRESENTATION                                    ║
║  public/js/, public/css/, app/views/ (.hbs)                  ║
╠══════════════════════════════════════════════════════════════╣
║  COUCHE 2 — ROUTING + MIDDLEWARE                             ║
║  app/routes/, app/middleware/ (auth, session, rateLimiter)    ║
╠══════════════════════════════════════════════════════════════╣
║  COUCHE 3 — CONTROLLERS (minces : parse → delegue → repond)  ║
║  app/controllers/                                            ║
╠══════════════════════════════════════════════════════════════╣
║  COUCHE 4 — SERVICES (logique metier)                        ║
║  app/services/ (wordProcessingService, gemini, importFile...) ║
╠══════════════════════════════════════════════════════════════╣
║  COUCHE 5 — DATA ACCESS (models)                             ║
║  app/models/ (requetes SQL uniquement)                       ║
╠══════════════════════════════════════════════════════════════╣
║  COUCHE 6 — INFRASTRUCTURE                                   ║
║  app/core/ (redis, rabbitmq, cache, jobTracker, database)    ║
║  app/queues/ (emailQueue, importQueue)                       ║
╠══════════════════════════════════════════════════════════════╣
║  COUCHE 7 — BACKGROUND PROCESSING                            ║
║  worker.js, scripts/                                         ║
╚══════════════════════════════════════════════════════════════╝
```

**Regle fondamentale** : Les dependances vont **toujours vers le bas**.
Un Model ne doit jamais appeler un Controller. Un Service ne doit jamais appeler une Route.

**Ou se situe cette architecture dans l'echelle professionnelle** :
```
MVC pur              → Petits projets, prototypes, tutoriels
  ↓
Layered + Services   → ★ CE PROJET ★ — Standard industrie pour apps Express.js
  ↓
Clean Architecture   → Grandes applications, independance framework
  ↓
Hexagonal/Ports      → Microservices, DDD (Domain-Driven Design)
  ↓
Event-Driven/CQRS    → Systemes distribues haute performance
```

---

## X. Fichiers crees et modifies

### Fichiers crees (nouveaux)

| Fichier | Role | Phase |
|---|---|---|
| `src/app/core/rabbitmq.js` | Connexion RabbitMQ (connect, channel, isReady) | P1 |
| `src/app/core/jobTracker.js` | Job state management Redis + Pub/Sub | P2 |
| `src/app/queues/emailQueue.js` | Queue email + DLX + retry + fallback | P1 |
| `src/app/queues/importQueue.js` | Queue import + parsing Excel + DLX | P2 |
| `src/app/controllers/apiControllers/JobController.js` | Endpoints jobs (puis migre dans api.js) | P2 |
| `src/app/services/wordProcessingService.js` | Pipeline unique Gemini→validate→save→cache | P2 |
| `src/app/services/streakService.js` | Logique streak backend | P2+ |
| `src/public/js/jobWatcher.js` | SSE client + persistence localStorage | P2 |
| `src/worker.js` | Process worker independant | P1 |
| `src/__tests__/unit/rabbitmq.test.js` | Tests connexion RabbitMQ | P1 |
| `src/__tests__/unit/emailQueue.test.js` | Tests email queue | P1 |
| `src/__tests__/unit/importQueue.test.js` | Tests import queue | P2 |
| `src/__tests__/unit/jobTracker.test.js` | Tests job tracker | P2 |
| `src/__tests__/unit/jobController.test.js` | Tests job controller | P2 |
| `src/__tests__/unit/streakService.test.js` | Tests streak service | P2+ |

### Fichiers modifies

| Fichier | Modifications | Phase |
|---|---|---|
| `src/app/services/importFile.js` | Refactore : parse → validate → queue ou fallback sync | P2 |
| `src/app/services/gemini.js` | `replaceExample` robuste (array + objet), `==` pour IDs | P2 |
| `src/app/controllers/WordController.js` | Thin controller, delegation a `processWords`/`enrichSingleWord`, JSON dans catch | P2 |
| `src/app/controllers/LearningController.js` | Simplifie : delegue a `streakService` | P2+ |
| `src/app/controllers/PackageController.js` | Fix `copyPackagePost` `packageId: undefined` | P2 |
| `src/app/core/redis.js` | Ajout `createSubscriber()` pour SSE | P2 |
| `src/app/routes/api.js` | SSE endpoint + ownership deny-by-default | P2 |
| `src/app.js` | Setup topologie email + import au demarrage | P2 |
| `src/worker.js` | Multi-consumer (email + import), force exit timer | P2 |
| `docker-compose.yml` | Volume partage `uploads_data`, healthchecks | P2 |
| `src/app/views/learnVocabs.hbs` | 2 boutons, stats, panel remaining-words | P2+ |
| `src/public/js/learnVocabs.js` | Logique boutons, panel, auto-save, streak trigger, CSS extrait | P2+ |
| `src/public/js/addWord.js` | `watchJob()` SSE, parsing erreurs JSON, duree notification 10s | P2 |
| `src/public/js/notification.js` | Support multilignes (`\n` → `<br>`) | P2 |
| `src/public/js/home.js` | Streak supprime, selecteurs corriges, dead code supprime | P2+ |
| `src/public/js/vocabs.js` | CSS extrait vers `styleVocabs.css` | P2+ |
| `src/public/js/games/speedVocab.js` | CSS extrait vers `speedVocab.css` | P2+ |
| `src/public/css/learnVocabs.css` | Animations + styles remaining words | P2+ |
| `src/public/css/styleVocabs.css` | Styles edit/alert/animations | P2+ |
| `src/public/css/games/speedVocab.css` | Keyframe screenShake | P2+ |
| `src/public/css/common/dark-mode.css` | Dark mode remaining words panel | P2+ |
| `src/public/css/common/main.css` | Notification multilignes | P2 |

---

## XI. Totalite des bugs trouves et corriges

| # | Severite | Fichier | Description |
|---|----------|---------|-------------|
| 1 | CRITIQUE | `docker-compose.yml` | Volume partage manquant entre app et worker |
| 2 | CRITIQUE | `api.js` | Race condition SSE (subscribe-then-check) |
| 3 | CRITIQUE | `importQueue.js` + `importFile.js` + `WordController.js` | Triple duplication pipeline Gemini |
| 4 | CRITIQUE | `WordController.js` | `editWordPost` crash — `geminiService` non importe |
| 5 | CRITIQUE | `importQueue.js` + `emailQueue.js` | Consumer crash si channel RabbitMQ meurt |
| 6 | HAUTE | `addWord.js` | Frontend affiche "succes" immediat sur reponse 202 |
| 7 | HAUTE | `PackageController.js` | `copyPackagePost` renvoie `packageId: undefined` |
| 8 | MOYEN | `jobTracker.js` | PUBLISH failure ecrase resultat SET |
| 9 | MOYEN | `api.js` | `res.write()` crash apres deconnexion client |
| 10 | MOYEN | `api.js` | Header `X-Accel-Buffering` manquant |
| 11 | MOYEN | `importFile.js` + `importQueue.js` | Duplication `parseExcelFile` |
| 12 | MOYEN | `importQueue.js` | Cache invalidation dupliquee |
| 13 | MOYEN | `gemini.js` | `replaceExample` casse quand 1 seul mot et array |
| 14 | MOYEN | `WordController.js` | Catch renvoie HTML au lieu de JSON |
| 15 | MOYEN | `gemini.js` | `===` strict pour IDs (Gemini peut renvoyer string) |
| 16 | MOYEN | `api.js` | Ownership check trop permissif |
| 17 | MOYEN | `WordController.js` + `importFile.js` | Job orphelin quand publish echoue |
| 18 | MOYEN | `importQueue.js` | `ch.ack()` success-path ecrase "completed" |
| 19 | MOYEN | `importQueue.js` | `parseExcelFile` crash sur fichier Excel vide |
| 20 | MOYEN | `home.js` | Selecteur `.hero-banner` → `.hero-section` |
| 21 | MOYEN | `home.js` | 3 fonctions mortes |
| 22 | MOYEN | `importQueue.js` | Dead code `filePath` + import `fs` |
| 23 | MOYEN | `jobTracker.js` | Race condition `sRem` fire-and-forget |
| 24 | BAS-MOYEN | `worker.js` | Pas de force exit timer |
| 25 | BAS | `importQueue.test.js` | Mock orphelin `jest.mock('fs')` |
| 26 | BAS | `learnVocabs.js` | Commentaire obsolete |
| 27 | BAS | `importFile.js` | Double `require` |

**Total : 27 bugs trouves et corriges en 9 passes d'audit.**

---

## XII. Principes et bonnes pratiques respectes

| Principe | Application |
|---|---|
| **SRP** | Chaque module = 1 responsabilite unique |
| **DRY** | Pipeline Gemini→save→cache en un seul endroit (`wordProcessingService`) |
| **Clean Architecture** | Controller → Service → Model, pas de logique metier dans les controllers |
| **Dependency Rule** | Dependances vont toujours vers le bas (jamais de require remontant) |
| **Fail-fast** | Validation avant tout traitement, erreurs detaillees immediates |
| **Graceful Degradation** | RabbitMQ down → fallback sync, Redis down → pas de job tracking |
| **Defense in Depth** | Ownership deny-by-default, try/catch interne dans les catch blocks |
| **Subscribe-then-check** | Pattern anti-race condition pour Pub/Sub |
| **Fire-and-forget notify** | PUBLISH Redis = best-effort, SET = source de verite |
| **Separation CSS/JS** | 0 `createElement('style')` dans les JS |
| **No dead code** | Imports inutilises, branches mortes, fonctions orphelines supprimes |
| **Thin Controllers** | Les controllers parsent les requetes et deleguent au Service Layer |

---

## XIII. Ce que font les professionnels en production

### Architecture identique
SSE + Redis Pub/Sub est utilise par GitHub (notifications), Stripe (dashboard),
ChatGPT (streaming), Vercel (build logs), Shopify (imports bulk).

### Pattern "HTTP 202 + jobId + SSE stream"
C'est le standard universel pour les operations longues :
Stripe (paiements), AWS S3 (processing), GitHub Actions (workflows).

### Niveaux de maturite
| Niveau | Approche |
|---|---|
| Junior | Short polling avec `setInterval` + `fetch` |
| Mid | SSE pour le suivi temps reel |
| **Senior** | **SSE + Redis Pub/Sub** (ce projet) |
| Expert | WebSocket + Redis Pub/Sub (chat, collaboration) |

### Pratiques additionnelles en entreprise
- **Circuit Breaker** (`opossum`) sur les appels externes (Gemini, SES)
- **Structured Logging** (JSON logs avec correlation ID)
- **Metrics/Observabilite** (Prometheus counters : jobs processed/failed, queue depth)
- **Chaos Engineering** (couper Redis/RabbitMQ en cours pour tester la resilience)
- **Static Analysis** (`eslint-plugin-security`, `npm audit`, `snyk`)

---

## XIV. Etat final

```
Tests:            305 passed, 305 total
Test Suites:      31 passed, 31 total
Lint errors:      0
createElement('style') dans JS: 0
Dead code:        0
Bugs corriges:    27 (5 critiques, 2 hauts, 17 moyens, 3 bas)
Audits effectues: 9 passes
```

**Phase 1 + Phase 2 + Phase 2 supplementaire : COMPLETS ET VALIDES.**

---

## XV. Phase 3 — Deployment Production + CI/CD Worker

### Objectif

Rendre le systeme de background jobs (RabbitMQ + Worker) operationnel en **staging et production** sur Railway, avec un CI/CD automatise pour les deux services.

### Brainstormings et decisions architecturales

#### CloudAMQP (externe) vs Railway (interne)

| Critere | CloudAMQP | Railway |
|---------|-----------|---------|
| Coherence architecturale | Mauvais (provider externe) | Excellent (tout sur Railway) |
| Latence reseau | ~10-20ms (Internet) | ~0.5ms (reseau prive) |
| Simplicite operationnelle | 2 providers | 1 provider |
| Monitoring | Excellent (dashboard avance) | Basique (Management UI) |

**Decision** : RabbitMQ sur Railway — la colocalisation l'emporte. Principe : *"Ne pas distribuer la complexite sans raison."*

#### Worker partage les memes ressources (DB, Redis) que le Web

**Decision** : Oui, c'est le pattern standard "Monolithe modulaire avec workers separes". La separation importante est le **compute** (CPU/RAM isoles), pas les datastores. Web et Worker traitent le meme domaine metier et doivent acceder aux memes donnees.

### Etapes realisees (en ordre)

| Etape | Description | Environnement |
|-------|-------------|----------------|
| 1 | Deployer RabbitMQ via template Railway | Staging |
| 2 | Configurer `RABBITMQ_DEFAULT_*` sur le Web App | Staging |
| 3 | Deployer le Worker (meme image Docker, `node worker.js`) | Staging |
| 4 | Adapter CI/CD : Web → Health check → Worker (sequentiel) | Staging + Production |
| 5 | Adapter healthcheck Docker pour le Worker (`pgrep`) | Local |
| 6 | Validation E2E en staging (import, email, RabbitMQ UI, health) | Staging |
| 7 | Monitoring (valide : Railway Metrics, RabbitMQ UI, /health, Redis) | Staging |
| 8 | Repliquer infrastructure en production (etapes 1-3 + secret GitHub) | Production |

### Architecture deployee (staging + production identiques)

```
Railway Project
├── Server Web          ← node app.js (HTTP, SSE, topologies RabbitMQ)
│     Image: ghcr.io/dhuy21/sealvo:<tag>
│     Networking: public HTTPS (domaine)
│
├── Worker1             ← node worker.js (consomme email + import queues)
│     Image: ghcr.io/dhuy21/sealvo:<tag> (meme image)
│     Start command: node worker.js
│     Networking: aucun (pas HTTP)
│
├── RabbitMQ            ← rabbitmq:management
│     Volume: /var/lib/rabbitmq (persistant)
│     Networking: prive uniquement (pas de TCP proxy public)
│     Exchanges: email.direct, email.retry.direct, import.direct, import.retry.direct
│     Queues: email.send, email.retry, email.failed, import.process, import.retry, import.failed
│
├── RabbitMQ Web UI     ← Reverse proxy vers port 15672
│     Networking: public HTTPS (dashboard administration)
│
├── Redis               ← Sessions, cache, job tracking, Pub/Sub
├── MySQL               ← Base de donnees applicative
├── CRON Service        ← Taches planifiees
└── Database Backup     ← Sauvegardes S3
```

### Securite

- RabbitMQ : **aucun acces public** (TCP proxy supprime). Accessible uniquement via `rabbitmq.railway.internal:5672`
- RabbitMQ Web UI : protege par credentials (user/pass)
- Worker : aucun port expose (pas de domaine, pas de TCP proxy)

### CI/CD (`.github/workflows/ci-cd.yml`)

```
Push staging/main → Lint & Test → Build Docker → Push GHCR
                                                     ↓
                                              Redeploy Web
                                                     ↓
                                            Health check (Web)
                                                     ↓
                                             Redeploy Worker
                                                     ↓
                                              E2E Tests
```

Ordre sequentiel : **Web d'abord** (execute les migrations DB), **Worker ensuite** (utilise le nouveau schema).

Secrets GitHub par environnement :

| Secret | Staging | Production |
|--------|---------|------------|
| `RAILWAY_TOKEN` | oui | oui |
| `RAILWAY_SERVICE_ID` | ID Web staging | ID Web production |
| `RAILWAY_WORKER_SERVICE_ID` | ID Worker staging | ID Worker production |

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/.github/workflows/ci-cd.yml` | Ajout steps "Redeploy Worker" dans staging et production |
| `src/docker-compose.yml` | Ajout healthcheck `pgrep` pour le service worker |
| `src/app/core/rabbitmq.js` | Variables renommees `RABBITMQ_DEFAULT_*` (coherence Railway) |
| `src/__tests__/unit/rabbitmq.test.js` | Variables renommees `RABBITMQ_DEFAULT_*` |
| `src/.env` | Variables renommees `RABBITMQ_DEFAULT_*` |
| `src/.env.example` | Variables renommees `RABBITMQ_DEFAULT_*` |

### Validation

**Staging :**
- Import 100 mots : ✅ (0 erreurs, via RabbitMQ + Gemini AI)
- Email async : ✅ (intercepte en staging, envoye via AWS SES)
- RabbitMQ UI : ✅ (4 exchanges, 6 queues, 2 connexions)
- Health check : ✅ `{"ok":true,"db":true,"redis":true,"rabbitmq":true}`
- Redis job tracking : ✅ (cles `job:*` avec TTL)

**Production :**
- Import 100 mots : ✅ (0 erreurs)
- SSE real-time : ✅ (`/api/jobs/*/stream 200`)
- Health check : ✅ `{"ok":true,"db":true,"redis":true,"rabbitmq":true}`
- Redis job tracking : ✅
- CI/CD secrets : ✅ (3 secrets dans l'environment production)

### Concepts et principes appliques

- **Infrastructure Parity** (12-Factor App) : staging et production identiques
- **Deploy in dependency order** : infrastructure → web (migrations) → worker
- **Principe du moindre privilege** : RabbitMQ non expose publiquement
- **Colocalisation des services** : tout sur Railway (pas de provider externe)
- **Graceful skip** : CI/CD ne plante pas si un secret manque
- **Process check healthcheck** : `pgrep` pour les workers non-HTTP

---

## XVI. Etat final global

```
Phases completees:    3/3 (Phase 1 + Phase 2 + Phase 3)
Environnements:       Local (Docker Compose) + Staging (Railway) + Production (Railway)
Services en prod:     8 (Web, Worker, RabbitMQ, RabbitMQ UI, Redis, MySQL, Cron, Backup)
Queues operationnelles: 6 (email.send/retry/failed, import.process/retry/failed)
CI/CD:                Web + Worker redeployes automatiquement
Health check:         DB + Redis + RabbitMQ
```

**Competence 4 — Background Jobs & Task Queues : Phase 1 + Phase 2 + Phase 3 COMPLETS ET VALIDES.**
