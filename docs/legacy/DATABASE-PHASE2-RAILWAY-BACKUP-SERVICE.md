# Phase 2 — Cron Service sur Railway (Backup + Object Storage)

Service cron dédié sur Railway. Actuellement : **backup MySQL automatique**
avec upload vers un Railway Storage Bucket (S3-compatible) et rétention.

> Ce service est nommé **Cron Service** (pas "db-backup") car il pourra
> héberger d'autres tâches planifiées à l'avenir (nettoyage de cache,
> synchronisation, rapports, etc.).

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Comment ça fonctionne](#2-comment-ça-fonctionne)
3. [Fichiers du projet](#3-fichiers-du-projet)
4. [Déploiement pas à pas](#4-déploiement-pas-à-pas)
5. [Watch Paths — éviter les rebuilds inutiles](#5-watch-paths--éviter-les-rebuilds-inutiles)
6. [Vérification](#6-vérification)
7. [Restore depuis le bucket](#7-restore-depuis-le-bucket)
8. [FAQ](#8-faq)

---

## 1. Vue d'ensemble

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Railway Project                                             │
│                                                              │
│  ┌──────────────┐   private network   ┌───────────────────┐ │
│  │ Server Web   │ ◄────────────────── │ MySQL (mysql:9)   │ │
│  │ sealvo       │       :3306         │ mysql.railway.     │ │
│  │ (GHCR image) │                     │ internal           │ │
│  └──────────────┘                     └─────────┬─────────┘ │
│                                                 │            │
│                                                 │ mysqldump  │
│                                                 │            │
│  ┌──────────────┐   S3 PutObject      ┌────────┴──────────┐ │
│  │ Bucket       │ ◄───────────────── │ db-backup          │ │
│  │ assembled-   │                     │ (cron service)     │ │
│  │ stashbox     │                     │ même repo GitHub   │ │
│  └──────────────┘                     │ Dockerfile.backup  │ │
│                                       └───────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

★ Le Cron Service doit être dans la **même région** que MySQL (Singapore)
pour que `mysqldump` reste sur le réseau privé Railway (latence < 1ms).

### Composants

| Composant | Source | Rôle |
|-----------|--------|------|
| **Server Web** | Image GHCR (`ghcr.io/dhuy21/sealvo:staging`), déployé par CI/CD | Application principale |
| **MySQL** | Image `mysql:9`, géré par Railway | Base de données |
| **Bucket** | `assembled-stashbox` (Railway Storage, S3-compatible) | Stockage durable des dumps |
| **Cron Service** | Même repo GitHub, branche `staging`, `Dockerfile.backup` | Tâches planifiées (backup, et d'autres à venir) |

---

## 2. Comment ça fonctionne

### Flux d'exécution — backup quotidien

```
Cron 02:00 UTC → Railway démarre le container Cron Service
  │
  ├── 1. mysqldump via réseau privé Railway
  │      → fichier local /app/backups/web_db_YYYYMMDD_HHMMSS.sql
  │
  ├── 2. Vérification : le dump contient-il des CREATE TABLE ?
  │      Non → exit 1 (échec)
  │      Oui → continue
  │
  ├── 3. Rétention locale : garder les 7 fichiers les plus récents
  │
  ├── 4. Variables bucket détectées ?
  │      Non → skip upload, log "No bucket config found"
  │      Oui ↓
  │
  ├── 5. Upload vers le bucket (S3 PutObject)
  │      Clé : backups/web_db_YYYYMMDD_HHMMSS.sql
  │
  ├── 6. Rétention bucket : garder les 7 dumps les plus récents,
  │      supprimer les plus anciens (ListObjectsV2 + DeleteObject)
  │
  └── 7. Log "Done." → process exit 0 → container s'arrête
```

### Cron + auto-deploy : pas de conflit

Le Cron Service est connecté au repo GitHub. Chaque push sur `staging`
déclenche un **rebuild**. Mais :

- Un cron configuré via le **Dashboard UI** ne s'exécute **PAS** lors d'un deploy.
- Il s'exécute **uniquement** à l'heure prévue (02:00 UTC).
- Le rebuild met à jour l'image, prête pour la prochaine exécution.

| Événement | Rebuild ? | Cron exécuté ? |
|-----------|-----------|----------------|
| Push sur staging | Oui (auto-deploy) | **Non** |
| Heure cron (02:00 UTC) | Non | **Oui** |

> Source : employé Railway (Jake) — *"Crons should not run on deploy"*
> Condition : cron configuré via le **Dashboard UI**, pas via `railway.json`.

De plus, les **Watch Paths** (section 5) permettent d'éviter même le rebuild
quand seuls des fichiers app changent.

---

## 3. Fichiers du projet

### `src/scripts/backup-db.js`

Script principal. Deux modes de connexion MySQL :
- **Docker** : si le container `web_vocab_db` est détecté (développement local)
- **Direct** : via `mysqldump -h <host>` (Railway, CI)

Variables bucket supportées (cherchées dans cet ordre) :

| Priorité | Bucket name | Endpoint | Access Key | Secret Key |
|----------|-------------|----------|------------|------------|
| 1 | `AWS_S3_BUCKET_NAME` | `AWS_ENDPOINT_URL` | `AWS_ACCESS_KEY_ID` | `AWS_SECRET_ACCESS_KEY` |
| 2 | `BUCKET_NAME` | `BUCKET_ENDPOINT` | `ACCESS_KEY_ID` | `SECRET_ACCESS_KEY` |
| 3 | `BUCKET` | `ENDPOINT` | — | — |

Railway injecte les noms de priorité 1 via le style "AWS SDK (Generic)"
lors du "Add to Service".

### `src/Dockerfile.backup`

Image légère pour le Cron Service :

```
node:20-bookworm-slim (Debian, pas Alpine)
  → npm ci --omit=dev           (dépendances production uniquement)
  → apt install default-mysql-client   (fournit mysqldump)
  → COPY scripts/backup-db.js   (seul le script nécessaire)
  → USER appuser                (non-root)
  → CMD node scripts/backup-db.js
```

Pourquoi `bookworm-slim` ? Parce que `default-mysql-client` (Debian) fournit
`mysqldump` de manière fiable. Alpine nécessite un paquet du dépôt community,
moins stable.

### `src/.dockerignore`

- `backups/` exclu (les dumps ne doivent jamais être dans une image).
- `scripts/backup-db.js` **non** exclu (nécessaire pour le build).

### `src/package.json`

- Dépendance : `@aws-sdk/client-s3` (upload vers le bucket).
- Scripts : `npm run backup:db`, `npm run restore:db`.

---

## 4. Déploiement pas à pas

### Étape 1 — Pousser le code

Vérifier que ces fichiers existent dans le repo :

```
src/
├── Dockerfile.backup
├── scripts/
│   └── backup-db.js
├── .dockerignore
└── package.json
```

```bash
cd src
git add Dockerfile.backup scripts/backup-db.js .dockerignore package.json
git commit -m "feat(backup): add Railway cron service with S3 bucket upload"
git push origin staging
```

### Étape 2 — Créer le service sur Railway

1. Ouvrir le projet Railway.
2. **"+ Create"** → **"GitHub Repo"** → sélectionner le même repo (dhuy21/Sealvo).
3. Railway crée un nouveau service.

### Étape 3 — Configurer le service (Settings)

Aller dans **Settings** du service nouvellement créé :

**Source :**

| Paramètre | Valeur | Explication |
|-----------|--------|-------------|
| **Name** | `Cron Service` | Nom générique car ce service hébergera d'autres tâches à l'avenir |
| **Root Directory** | `src` | Le code est dans le dossier `src/` du repo |
| **Branch** | `staging` | Déjà connecté si créé depuis le projet staging |

> **Nommer le service :** Cliquer sur le nom du service en haut à gauche du
> panneau pour le renommer. Taper `Cron Service` et valider.

**Build :**

| Paramètre | Valeur | Explication |
|-----------|--------|-------------|
| **Builder** | Dockerfile | Par défaut |
| **Dockerfile Path** | `Dockerfile.backup` | Chemin relatif au Root Directory (`src/`) |

> Railway offre aussi un champ **Dockerfile Path** directement dans les Settings
> → Build. Mettre `Dockerfile.backup` ici. C'est équivalent à la variable
> `RAILWAY_DOCKERFILE_PATH` mais plus visible.

**Scale :**

| Paramètre | Valeur | Explication |
|-----------|--------|-------------|
| **Region** | **Southeast Asia (Singapore)** | Même région que MySQL = dump rapide via réseau privé |

**Deploy :**

| Paramètre | Valeur | Explication |
|-----------|--------|-------------|
| **Cron Schedule** | `0 2 * * *` | Tous les jours à 02:00 UTC (09:00 VN) |
| **Restart Policy** | On Failure (défaut) | Retry si crash |

> **Important :** Configurer le cron **via le Dashboard UI uniquement**.
> Ne pas utiliser `railway.json` / `railway.toml` — bug connu : le
> config-as-code déclenche le cron à chaque deploy.

### Étape 4 — Variables : MySQL

Dans l'onglet **Variables** du Cron Service, ajouter ces **Variable References** :

```
MYSQLHOST=${{MySQL.MYSQLHOST}}
MYSQLPORT=${{MySQL.MYSQLPORT}}
MYSQL_DATABASE=${{MySQL.MYSQL_DATABASE}}
MYSQLUSER=${{MySQL.MYSQLUSER}}
MYSQL_ROOT_PASSWORD=${{MySQL.MYSQL_ROOT_PASSWORD}}
```

> Remplacer `MySQL` par le nom exact de votre service MySQL dans Railway
> (visible en haut du service). Ex : si le service s'appelle `MySQL`,
> la syntaxe est `${{MySQL.VARIABLE}}`.

### Étape 5 — Variables : Bucket

1. Cliquer sur le bucket **assembled-stashbox** dans le projet Railway.
2. **Credentials** → **"Add to Service"**.
3. Dans le dialogue :
   - **Service** : sélectionner `Cron Service`
   - **Style** : `AWS SDK (Generic)`
4. Garder les noms par défaut :

| Variable | Référence |
|----------|-----------|
| `AWS_ENDPOINT_URL` | `${{assembled-stashbox.ENDPOINT}}` |
| `AWS_S3_BUCKET_NAME` | `${{assembled-stashbox.BUCKET}}` |
| `AWS_DEFAULT_REGION` | `${{assembled-stashbox.REGION}}` |
| `AWS_ACCESS_KEY_ID` | `${{assembled-stashbox.ACCESS_KEY_ID}}` |
| `AWS_SECRET_ACCESS_KEY` | `${{assembled-stashbox.SECRET_ACCESS_KEY}}` |

5. Cliquer **"Add Variables"**.

> **Pas de conflit avec SES :** Le Cron Service est un service séparé
> du Server Web. Il n'a pas les variables AWS SES. `AWS_ACCESS_KEY_ID`
> ici = credentials du bucket uniquement.

### Étape 6 — Premier build et test

Railway a normalement déjà lancé un build après l'étape 2. Vérifier :

1. **Deployments** → un build doit être visible.
2. Si pas de build : **Cmd+K** → **"Deploy Latest Commit"**.
3. Le build prend ~1-2 minutes. Après le build, le service **ne s'exécute pas** :
   il attend la prochaine heure cron.

Pour **forcer une exécution immédiate** (test) :
- **Cmd+K** → chercher **"Run Cron Job"**

Vérifier les logs (section 6).

---

## 5. Watch Paths — éviter les rebuilds inutiles

### Le problème

Le Cron Service est connecté au même repo que le Server Web. Par défaut,
**chaque push sur `staging`** déclenche un rebuild — même si vous avez
seulement modifié un fichier CSS ou une route Express. Le cron ne s'exécute
pas, mais le build consomme du temps et des ressources.

### La solution : Watch Paths

Railway offre une fonctionnalité native **Watch Paths** (Settings → Build)
qui dit : "Ne rebuild que si ces fichiers ont changé."

### Configuration

Service **Cron Service** → **Settings** → **Build** → **Watch Paths** :

Ajouter ces patterns (un par ligne, cliquer "Add pattern" pour chacun) :

```
/src/scripts/backup-db.js
/src/Dockerfile.backup
/src/package.json
/src/package-lock.json
```

> **Syntaxe :** Les patterns sont relatifs à la **racine du repo** (pas au
> Root Directory). Même si Root Directory = `src`, il faut écrire `/src/...`.

### Résultat

| Vous poussez... | Rebuild Cron Service ? |
|-----------------|------------------------|
| Un fichier route, view, CSS | **Non** (skip) |
| `scripts/backup-db.js` | **Oui** |
| `Dockerfile.backup` | **Oui** |
| `package.json` (nouvelle dépendance) | **Oui** |
| Tout autre fichier | **Non** (skip) |

### Si vous ajoutez d'autres scripts cron à l'avenir

Quand vous ajouterez un nouveau script au Cron Service (ex. `scripts/cleanup.js`),
pensez à ajouter son chemin dans Watch Paths :

```
/src/scripts/cleanup.js
```

---

## 6. Vérification

### Lire les logs

Cron Service → **Deployments** → cliquer sur l'exécution → **Logs**.

Logs attendus (succès) :

```
[backup] Starting...
[backup] Using direct connection (mysql.railway.internal:3306)
[backup] Written: /app/backups/web_db_20260304_020000.sql (45.2 KB)
[backup] Verified: 12 table(s) (users, vocabularies, ...)
[backup] Bucket detected (https://t3.storageapi.dev), uploading...
[backup] Uploaded to bucket: backups/web_db_20260304_020000.sql (45.2 KB)
[backup] Bucket retention: keeping 1/1 dumps
[backup] Done.
```

### Vérifier le contenu du bucket

Depuis votre machine, avec AWS CLI :

```bash
export AWS_ACCESS_KEY_ID="tid_JGDoZaGOwAMNJGqpOwdhGjfxKMurK_NtYmOMRRDeZKnfrHXlgQ"
export AWS_SECRET_ACCESS_KEY="<votre secret>"
export AWS_ENDPOINT_URL="https://t3.storageapi.dev"

aws s3 ls s3://assembled-stashbox-atppxy/backups/
```

### Checklist post-déploiement

| # | Vérification | Attendu |
|---|-------------|---------|
| 1 | Build réussi ? | Deployments → statut vert |
| 2 | Variables visibles ? | Variables → 5 MySQL + 5 Bucket = 10+ variables |
| 3 | Région correcte ? | Settings → Scale → Singapore |
| 4 | Cron affiché ? | Settings → Deploy → `0 2 * * *` |
| 5 | Watch Paths ? | Settings → Build → 4 patterns |
| 6 | Logs après exécution ? | "Done." en dernière ligne |
| 7 | Fichier dans le bucket ? | `aws s3 ls ...` → au moins 1 fichier `.sql` |

### Cas d'échec courants

| Symptôme | Cause | Solution |
|----------|-------|----------|
| `Missing env: MYSQLHOST` | Variables MySQL non connectées | Étape 4 |
| `mysqldump failed: Access denied` | Mauvais user/password | Vérifier les références MySQL |
| `mysqldump: not found` | Image sans mysql-client | Vérifier Dockerfile Path = `Dockerfile.backup` |
| `No bucket config found` | Variables bucket manquantes | Étape 5 |
| `AccessDenied` sur PutObject | Bucket mal connecté | Refaire étape 5 |
| Build utilise le mauvais Dockerfile | Dockerfile Path non configuré | Settings → Build → `Dockerfile.backup` |

---

## 7. Restore depuis le bucket

### Télécharger un dump

```bash
export AWS_ACCESS_KEY_ID="tid_JGDoZa..."
export AWS_SECRET_ACCESS_KEY="<votre secret>"
export AWS_ENDPOINT_URL="https://t3.storageapi.dev"

# Lister les dumps disponibles
aws s3 ls s3://assembled-stashbox-atppxy/backups/

# Télécharger le plus récent
aws s3 cp s3://assembled-stashbox-atppxy/backups/web_db_20260304_020000.sql ./backups/
```

### Restore en local (Docker)

```bash
cd src

# Dry run — affiche les infos du dump sans rien exécuter
npm run restore:db -- ./backups/web_db_20260304_020000.sql

# Exécuter le restore dans la DB par défaut
npm run restore:db -- ./backups/web_db_20260304_020000.sql --confirm

# Restore dans une DB différente (créée automatiquement si inexistante)
npm run restore:db -- ./backups/web_db_20260304_020000.sql --target web_db_test --confirm
```

### Restore sur Railway (via l'endpoint public MySQL)

```bash
export MYSQLHOST=shinkansen.proxy.rlwy.net
export MYSQLPORT=30935
export MYSQLUSER=root
export MYSQL_ROOT_PASSWORD=<password>
export MYSQL_DATABASE=railway

npm run restore:db -- ./backups/web_db_20260304_020000.sql --confirm
```

---

## 8. FAQ

### Pourquoi "Cron Service" et pas "db-backup" ?

Ce service est une image légère avec `mysqldump` et Node.js. Il est conçu
pour exécuter des **tâches planifiées**. Aujourd'hui c'est le backup, mais
demain ça peut être du nettoyage de fichiers temporaires, de la
synchronisation, ou des rapports. Un nom générique évite de devoir
renommer ou recréer le service.

### Le Cron Service rebuild à chaque push ?

**Non**, si les **Watch Paths** sont configurés (section 5). Il ne rebuild
que quand `backup-db.js`, `Dockerfile.backup`, `package.json` ou
`package-lock.json` changent. Les autres pushes sont ignorés.

### Et si le Cron Service rebuild quand même ?

Ce n'est pas un problème. Le cron configuré via le Dashboard UI ne
s'exécute **jamais** lors d'un deploy — uniquement à l'heure prévue.
Le rebuild met juste à jour l'image en attente.

### Pourquoi Singapore pour le Cron Service ?

MySQL est à Singapore. `mysqldump` dans la même région utilise le réseau
privé Railway (< 1ms de latence). Cross-continent (Amsterdam → Singapore)
ajouterait ~200-300ms par requête, ralentissant le dump.

### Le dump est temporaire dans le container ?

Oui. Le dump est écrit dans `/app/backups/`, uploadé vers le bucket, puis
le container s'arrête et est détruit. Le fichier local disparaît. Seul le
bucket conserve les dumps de manière durable.

### Comment changer la rétention ?

Par défaut : 7 dumps conservés (local + bucket). Pour modifier, ajouter
la variable `BACKUP_RETENTION=14` dans les Variables du Cron Service.

### Le bucket est-il accessible publiquement ?

Non. Railway Storage Buckets sont **privés**. Seuls les services ayant les
credentials peuvent y accéder.

### Comment ajouter une autre tâche au Cron Service ?

1. Créer le script (ex. `scripts/cleanup.js`).
2. Modifier le `CMD` dans `Dockerfile.backup` pour exécuter les deux scripts,
   ou créer un script orchestrateur (`scripts/cron-runner.js`) qui les appelle.
3. Ajouter le nouveau fichier dans les Watch Paths.
4. Push → rebuild automatique.

### Coût estimé

| Ressource | Coût |
|-----------|------|
| Exécution cron (quelques secondes/jour) | ~$0 |
| Bucket storage (7 dumps × ~50 KB) | ~$0 |
| Build (seulement quand fichiers backup changent) | Négligeable |
| **Total** | **~$0/mois** |
