# Analyse détaillée du projet SealVo (Web_vocab_v0)

## 1. Résumé du projet et de l’architecture

### 1.1 Objectif
Application web d’apprentissage de vocabulaire avec **répétition espacée** (niveaux x → 0 → 1 → 2 → v), **gamification** (streaks, jeux, niveaux) et intégration **AI** (Gemini) et **TTS** (Google Cloud).

### 1.2 Stack technique
- **Backend:** Node.js, Express 5, Handlebars
- **Base de données:** MySQL (tables: users, email_verification, packages, words, word_details, learning, reset_password, game_scores)
- **Auth:** Session Express, Google OAuth, bcrypt, vérification email, reset password
- **Sécurité:** Helmet, CSP nonce, sanitization (DOMPurify, validator), session sécurisée
- **Frontend:** JS vanilla, CSS (dont dark mode)

### 1.3 Architecture globale
- **MVC** avec couche **services** (gemini, TTS, mail, import fichier).
- **Routes** par domaine: site, user (login, registre, logout, dashboard), vocab (monVocabs), package (myPackages), games (sous-routes par jeu), auth (Google, verify), api (reminder, TTS), level-progress.
- **Modèles:** users, words (＋ word_details, learning), packages, learning, game_scores, email_verification, resetPass.
- **Contrôleurs:** un par domaine + gameControllers par jeu (données pour chaque jeu).

### 1.4 Flux métier principaux
- **Inscription / Connexion:** registre → vérification email → login (ou Google OAuth).
- **Vocabulaire:** packages → mots par package → niveaux (x,0,1,2,v) dans `learning`; mots à réviser aujourd’hui selon intervalles (0, 2, 4, 10, 20 jours).
- **Jeux:** 7 jeux (Flash Match, Speed Vocab, Vocab Quiz, Phrase Completion, Word Search, Word Scramble, Test Pronun) chacun lié à un niveau (x, 0, 1, 2). Mots tirés selon `findWordsByLevel` / `countUserWordsByLevel`.
- **Progression niveau:** `level-progress/track` enregistre quels jeux sont complétés (par niveau); quand tous les jeux d’un niveau sont faits, les mots “à réviser aujourd’hui” à ce niveau passent au niveau suivant via `learning.updateLevelWord`. Progression stockée en **global.levelProgress** (mémoire), pas en base.
- **Scores:** frontend appelle `/games/score` (ou `/games/wordSearch/saveScore`) pour enregistrer le score; **aucune route ne pointe vers ces endpoints** (voir points faibles).
- **Streak:** POST `/update-streak` (auth requise) met à jour la série de jours consécutifs (une fois par jour).

---

## 2. Points forts (avantages)

- **Séparation des responsabilités:** Routes → Contrôleurs → Modèles + Services claire; pas de logique métier dans les routes.
- **Sécurité:** Helmet, CSP avec nonce, sanitization des entrées (POST), session avec options sécurisées; vérification email et reset password par token.
- **Modèle de données cohérent:** `words` + `word_details` + `learning` (par package) permet réutilisation des mêmes mots dans plusieurs packages et suivi par niveau par package.
- **Spaced repetition explicite:** Intervalles par niveau (0, 2, 4, 10, 20 jours) et requêtes “mots à réviser aujourd’hui” bien définies dans le modèle `learning`.
- **Jeux alignés aux niveaux:** Chaque jeu utilise un niveau fixe (x, 0, 1, 2), cohérent avec la logique “réviser aujourd’hui”.
- **Réutilisation du code:** `isAuthenticated` et logique d’auth répétée mais compréhensible; contrôleurs de jeux homogènes (package_id, niveau, mots).
- **UX:** Dark mode, feedback utilisateur, messages d’erreur en français, rappels par email (cron).
- **Documentation interne:** Commentaires et noms de fonctions en français, lisibles.

---

## 3. Points faibles et incohérences

### 3.1 Critique : sauvegarde des scores (404)

- **Constat:** Le frontend envoie les scores vers:
  - `POST /games/score` (flashMatch, speedVocab, vocabQuiz, phraseCompletion, wordScramble, testPronun)
  - `POST /games/wordSearch/saveScore` (wordSearch)
- **Problème:** Aucune route n’est définie pour ces URLs dans `routes/game/game.js` (ni ailleurs). `GameController.saveScore` existe mais n’est jamais attaché.
- **Conséquence:** Toutes les sauvegardes de scores renvoient **404**; les scores ne sont pas enregistrés.

**Recommandation:** Ajouter par exemple:
- `router.post('/score', isAuthenticated, gameController.saveScore);`
- et pour Word Search soit utiliser le même `POST /games/score` avec `game_type: 'word_search'`, soit ajouter `POST /wordSearch/saveScore` qui délègue à la même logique.

---

### 3.2 Critique : table `game_scores` et ENUM

- **Constat:** Dans `database.sql`, `game_scores.game_type` est:
  - `ENUM('word_scramble', 'flash_match', 'speed_vocab', 'vocab_quiz')`
- **Problème:** Le contrôleur `GameController.saveScore` accepte aussi `phrase_completion`, `word_search`, `test_pronun`. Si on ajoute la route, les insertions pour ces trois jeux provoqueront une **erreur MySQL** (valeur non autorisée dans l’ENUM).
- **Incohérence:** `game_scores.js` (getUserGameStats) initialise des stats pour `phrase_completion` et `word_search` mais pas `test_pronun`, et la base ne les accepte pas.

**Recommandation:** Étendre l’ENUM en base:
```sql
ALTER TABLE game_scores MODIFY game_type ENUM(
  'word_scramble', 'flash_match', 'speed_vocab', 'vocab_quiz',
  'phrase_completion', 'word_search', 'test_pronun'
) NOT NULL;
```
Puis aligner `getUserGameStats` (et toute liste de types de jeux) sur cette liste.

---

### 3.3 Sanitization : chemin incorrect pour “add word”

- **Constat:** Dans `middleware/inputSanitization.js`, la config “addWord” utilise le chemin `/addWord`.
- **Problème:** Le formulaire d’ajout de mot est soumis en **POST `/monVocabs/add`**. La sanitization spécifique à “add word” ne s’applique donc jamais à la bonne route.
- **Conséquence:** Seule la sanitization POST générale s’applique; les champs sensibles (word, meaning, example, etc.) ne bénéficient pas de la config dédiée si elle devait différer.

**Recommandation:** Remplacer `path: '/addWord'` par `path: '/monVocabs/add'` (ou le chemin exact utilisé par le routeur).

---

### 3.4 Duplication du middleware d’authentification

- **Constat:** `isAuthenticated` (ou équivalent) est redéfini dans plusieurs fichiers: `routes/game/game.js`, `routes/vocab/monVocabs.js`, `routes/user/dashboard.js`, `routes/level_progress.js`, etc. `ensureAuthenticated` dans `routes/index.js` est utilisé uniquement pour POST `/update-streak`.
- **Problème:** Toute évolution (ex: message de redirection, log) doit être répétée partout; risque d’incohérence.
- **Recommandation:** Centraliser un seul middleware (ex. `middleware/auth.js` ou dans `routes/index.js`) et l’importer partout où une page ou une API exige un utilisateur connecté.

---

### 3.5 Progression de niveau en mémoire (global.levelProgress)

- **Constat:** `LevelProgressController.getUserLevelProgress` et `saveUserLevelProgress` utilisent `global.levelProgress[sessionKey]` (objet global en mémoire).
- **Problème:** En multi-instances ou après redémarrage du serveur, la progression “quels jeux ont été complétés pour chaque niveau” est perdue. Elle n’est pas liée à la session utilisateur côté store de session (ex. Redis) ni persistée en base.
- **Recommandation:** Persister la progression soit en base (table dédiée), soit dans la session (si store de session persistant), pour qu’elle survive aux redémarrages et soit cohérente en cluster.

---

### 3.6 Nom de type de jeu : test_pronun vs test_pronunciation

- **Constat:** Dans `LevelProgressController`, `gameLevel` et `levelGames` utilisent la clé `'test_pronunciation'`. Le frontend testPronun envoie `game_type: 'test_pronunciation'` pour **level-progress/track** mais `game_type: 'test_pronun'` pour **saveScore**.
- **Problème:** Une fois la route de score en place, la base et le contrôleur utiliseront `test_pronun`. Pour le level progress, le backend attend `test_pronunciation`; le frontend l’envoie déjà correctement pour track. Il n’y a pas de bug ici, mais deux identifiants pour le même jeu (track vs score) — à documenter ou unifier pour éviter la confusion.

---

### 3.7 Learning.updateLevelWord : niveau ‘v’ non géré

- **Constat:** Dans `learning.js`, `updateLevelWord` fait un `switch (levelCurrent)` pour x→0, 0→1, 1→2, 2→v. Il n’y a pas de `case 'v'`; `newLevel` reste donc `undefined` si on appelait avec ‘v’.
- **Risque:** Si un jour la logique appelle `updateLevelWord(..., 'v')`, l’UPDATE mettrait `level = undefined` (comportement indéfini / erreur).
- **État actuel:** LevelProgressController n’appelle cette fonction que pour des mots “à réviser aujourd’hui” à un niveau donné (x, 0, 1, 2), jamais pour des mots déjà en ‘v’. Donc pas de bug actuel, mais code fragile.
- **Recommandation:** Ajouter un `case 'v': return;` (ou ne pas mettre à jour) pour rendre l’intention explicite et éviter des mises à jour erronées.

---

### 3.8 WordController.monVocabs : risque si example est null

- **Constat:** `word.example.replace(/\*\*([^\*]+)\*\*/g, '$1')` est appelé pour chaque mot sans vérifier que `word.example` existe.
- **Problème:** Si un enregistrement a `example` NULL (ou non chaîne), `.replace` lèvera une exception.
- **Recommandation:** Utiliser par exemple `(word.example || '').replace(...)` ou vérifier le type avant.

---

### 3.9 Incohérence “subject” dans words (edit vs create)

- **Constat:** Lors de la création d’un mot (`words.create`), `wordData.subject` est utilisé. Lors de la mise à jour (`words.updateWord`), si le mot change (nouveau `word_id`), le code insère un nouveau `words` avec **subject fixe `'Daily'`** (ligne 219), sans utiliser `wordData.subject`.
- **Problème:** En édition, si le formulaire ne renvoie pas `subject`, on perd l’info; si on voulait garder le subject, il est écrasé par ‘Daily’.
- **Recommandation:** Soit récupérer et conserver `subject` en édition (depuis le formulaire ou l’ancien enregistrement), soit documenter que “subject” n’est pas éditable et garder l’ancien quand on ne crée pas un nouveau `words`.

---

### 3.10 Learning.updateLevelWord : valeur de retour

- **Constat:** La fonction fait un `UPDATE` et retourne `rows[0]`. Avec MySQL2, le résultat d’un UPDATE est un OkPacket, pas un tableau de lignes; `rows[0]` peut être undefined.
- **Impact:** Aucun appelant ne semble utiliser cette valeur de retour; impact limité.
- **Recommandation:** Retourner par exemple `result.affectedRows` ou ne rien retourner d’utile, pour éviter toute confusion future.

---

## 4. Synthèse des actions prioritaires

| Priorité | Problème | Action |
|----------|----------|--------|
| 1 | Scores non enregistrés (404) | Ajouter POST `/games/score` (et évent. `/games/wordSearch/saveScore`) avec `GameController.saveScore` |
| 2 | ENUM game_scores trop restreint | Étendre l’ENUM à phrase_completion, word_search, test_pronun |
| 3 | Sanitization add word | Changer le chemin de `/addWord` à `/monVocabs/add` |
| 4 | Progression niveau volatile | Persister la progression (table ou session persistante) |
| 5 | Auth dupliquée | Centraliser isAuthenticated / ensureAuthenticated |
| 6 | Robustesse | Gérer `example` null dans monVocabs; gérer niveau ‘v’ dans updateLevelWord; documenter ou unifier test_pronun / test_pronunciation |

---

## 5. Conclusion

L’**architecture globale est saine** (MVC, modèles clairs, sécurité prise au sérieux, logique spaced repetition et niveaux bien posée). Les **incohérences les plus bloquantes** sont l’absence de route pour la sauvegarde des scores et l’ENUM de `game_scores` qui ne couvre pas tous les jeux. Une fois la route de score ajoutée et l’ENUM étendu, les scores pourront être enregistrés correctement pour tous les jeux. Les autres points (sanitization, auth, persistance de la progression, petites robustesses) amélioreront la maintenabilité et la fiabilité à moyen terme.
