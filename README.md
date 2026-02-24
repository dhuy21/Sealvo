<div align="center">

# 🎯 Web Vocab v0 | SealVo

### _Révolutionnez votre apprentissage du vocabulaire avec la révision espacée_

![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-0.1.0-blue?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=nodedotjs)

**🚀 Une plateforme d'apprentissage moderne qui transforme l'étude du vocabulaire en une expérience interactive et motivante !**

[🎮 Démo Live](https://www.sealvo.it.com) • [📖 About me ](https://www.sealvo.it.com/aboutme) • [🐛 Signaler un Bug](https://www.sealvo.it.com/feedback)

---

</div>

## 🌟 Aperçu Rapide

> **SealVo** est une application web moderne qui combine un système de révision espacée intelligent de Flashcards avec une interface gamifiée pour créer l'expérience d'apprentissage de vocabulaire la plus efficace et engageante.

### ✨ Pourquoi SealVo ?

<details>
<summary>🎯 <strong>Révision Espacée Intelligente</strong> - Mémorisation optimisée</summary>

- Adaptation automatique selon vos performances
- Rappels intelligents pour optimiser la rétention
- Suivi des intervalles de révision optimaux
</details>

<details>
<summary>🎮 <strong>Gamification Avancée</strong> - Learning meets Gaming</summary>

- Système de streaks avec animations visuelles
- Jeux interactifs intégrés (`/games/`)
- Progress tracking avec statistiques détaillées

</details>

<details>
<summary>📦 <strong>Système de Packages</strong> - Organisez votre apprentissage</summary>

- Création de packages thématiques (`myPackages.hbs`)
- Import/Export de vocabulaire par lots
- Generer les exemples intelligentes par l'appel API de Google Gemini-2.5-flash
- Partage de packages entre utilisateurs
- Gestion avancée des collections

</details>

<details>
<summary>🔒 <strong>Sécurité & Performance</strong> - Protection maximale</summary>

- Helmet.js pour les en-têtes de sécurité
- Sanitization avancée avec DOMPurify
- Content Security Policy (CSP)
- Gestion sécurisée des sessions

</details>

---

## 🎯 Fonctionnalités Principales

### 📚 **Gestion Avancée du Vocabulaire**

| Fonctionnalité                                 | Description                                       | Status |
| ---------------------------------------------- | ------------------------------------------------- | ------ |
| 📁 **Package System**                          | Organisation thématique avancée                   | ✅     |
| 🌐 **Partage de packages entre utilisateurs**  | 3 options de partage (protected, private, public) | ✅     |
| 🔄 **Spaced Repetition**                       | Système d'appel de révision espacée               | ✅     |
| 📱 **Mobile-First**                            | Interface responsive optimisée                    | ✅     |
| 🤖 **AI Assistance (Googel Gemini-2.5-Flash)** | Aide optionnelle pour generer les exemples        | ✅     |

### 🎮 **Système de Jeux Intégré**

- **Memory Cards** : Jeu de mémoire avec vos mots
- **Phrases Completition** : Jeu de complétion de phrases avec vos mots
- **Speed Vocab** : Jeu de vitesse de taper des mots
- **Prononciation** : Jeu de prononciation de mots
- **Quiz** : Jeu de quiz avec vos mots
- **Word Scramble** : Jeu de désordre de mots
- **Word Search** : Jeu de recherche de mots

### 🧠 **Système de Révision Espacée**

- **Rappels intelligents** : Notifications au moment optimal
- **Suivi de progression** : Visualisation de votre amélioration
- **Statistiques** : Visualisation de votre progression

---

## 🏗️ Architecture Technique

<details>
<summary>🔧 <strong>Stack Technologique Complète</strong></summary>

### **Backend Robuste**

- **Node.js** + **Express 5** : Serveur haute performance
- **MySQL2** : Base de données relationnelle optimisée
- **Handlebars** : Templates dynamiques
- **Node-cron** : Tâches automatisées et rappels
- **Multer** : Gestion des uploads de fichiers

### **Frontend Moderne**

- **JavaScript** : Performance native
- **CSS Grid/Flexbox** : Layouts responsives
- **Web APIs** : Notifications, localStorage, etc.
- **Progressive Enhancement** : Expérience dégradée gracieuse

### **Sécurité & Performance**

- **Helmet.js** : Headers de sécurité
- **DOMPurify** : Sanitization XSS
- **bcryptjs** : Hachage sécurisé
- **Morgan** : Logging des requêtes
- **Validator** : Validation des données

### **Outils Optionnels**

- **Google Generative AI** : Assistance pour définitions (optionnel)
- **Nodemailer** : Envoi d'emails
- **XLSX** : Import/Export Excel

</details>

<details>
<summary>🏛️ <strong>Architecture MVC Avancée</strong></summary>

```
📁 SealVo Architecture
├── 🎯 app/
│   ├── 🎮 controllers/     # Logique métier
│   │   ├── gameControllers/ # Logique des jeux
│   │   ├── SiteController.js # Pages principales
│   │   ├── LearningController.js # Système d'apprentissage
│   │   └── UserController.js # Gestion utilisateurs
│   │   └── WordController.js # Gestion des mots
│   │   └── PackageController.js # Gestion des packages
│   │   └── ...
│   ├── 📊 routes/         # Routes
│   │   ├── api.js        # API REST
│   │   ├── auth/         # Authentification
│   │   ├── user/         # Gestion utilisateurs
│   │   ├── vocab/         # Gestion des mots
│   │   ├── game/        # Interfaces de jeux
│   │   ├── level_progress.js # Système de progression de niveau
│   │   ├── package/      # Gestion des packages
│   │   ├── site.js       # Pages principales
│   │   └── ...
│   ├── 📊 core/         # Core
│   │   ├── database.js # Connexion à la base de données
│   │   ├── database.sql # Création des tables
│   │   └── ...
│   ├── 📊 models/         # Modèles de données
│   │   ├── users.js        # Gestion utilisateurs
│   │   ├── words.js        # Vocabulaire
│   │   ├── packages.js     # Système de packages
│   │   └── learning.js    # Révision espacée
│   ├── 🛡️ middleware/     # Middleware sécurité
│   │   ├── inputSanitization.js        # Authentification
│   │   ├── sanitization.js # Nettoyage XSS
│   │   └── security.js  # Validation données
│   │   └── session.js  # Gestion des sessions
│   ├── 🔄 services/       # Services métier
│   │   ├── gemini.js # Google Gemini-2.5-Flash
│   │   ├── importFile.js # Importation de fichiers
│   │   └── ...
│   └── 🎨 views/          # Templates Handlebars
│        ├── mails/          # Mails templates
│        ├── games/         # Interfaces de jeux
│        ├── layouts/       # Layouts réutilisables
│        ├── partials/      # Composants
│        └── ...
|
├── 📊 public/         # Public
│   ├── css/          # CSS
│   ├── js/           # JavaScript
│   ├── images/       # Images
│   └── ...
|
app.js # Point d'entrée du serveur
```

</details>

---

## 🚀 Installation & Configuration

### **Prérequis Système**

```bash
# Vérifiez votre configuration
node --version  # v18.0.0+
npm --version   # v8.0.0+
mysql --version # v8.0+
```

### **Installation Express** ⚡

```bash
# 1. Clonage du projet
git clone https://github.com/votre-repo/Web_vocab_v0.git
cd Web_vocab_v0/src

# 2. Installation des dépendances
npm install

# 3. Configuration rapide
cp src/app/config/.env.example src/app/config/.env
nano src/app/config/.env  # Éditez vos variables

# 4. Démarrage immédiat ( mode du developpement en local)
npm run dev
```

### **Configuration Avancée** 🔧

<details>
<summary>📧 <strong>Configuration Email & Base de Données</strong></summary>

```env
# 🖥️ Server Configuration
PORT=3000
NODE_ENV=development

#If you want to use the production environment, you can change the NODE_ENV to production and set the #SESSION_SECRET = your_secret_for_session_here

# 🗄️ Database Configuration
DB_HOST= name_of_your_host
DB_DATABASE= name_of_your_database
DB_PORT= 3306
DB_USER= name_of_your_user
DB_PASSWORD= name_of_your_password
DB_DIALECT= mysql

# 🔐 Google Auth Configuration
GOOGLE_CLIENT_ID= id_of_your_google_client
GOOGLE_CLIENT_SECRET= secret_of_your_google_client

# 🔊 Google Cloud text-to-speech
GOOGLE_SERVICE_ACCOUNT_CREDENTIALS = the content of the json file of your google cloud service account

# 🤖 Gemini API Key
GEMINI_API_KEY_1 = key_of_your_gemini_api

# 📧 Email Configuration
USER_GMAIL = name_of_your_gmail

# 🌐 URL Configuration
BASE_URL=https://your_domain.com/
DOMAIN=your_domain

```

</details>

<details>
<summary>🗄️ <strong>Configuration Base de Données</strong></summary>

```bash
-- Création automatique des tables par le fichier database.sql
cd src/app/core
mysql -u user_name -p < database.sql

Or you can connect to your database mysql with your favorite tool and execute the file database.sql

-- Les tables sont créées automatiquement au démarrage
```

</details>

---

## 🎮 Guide d'Utilisation

### **🎯 Démarrage Rapide**

1. **Créez votre compte** 👤

   ```
   📧 Email + mot de passe sécurisé
   ✅ Vérification automatique
   🎨 Personnalisation du profil par choix de l'avatar
   🔒 Les passwords sont hachés avec bcryptjs dans la base de données

   Or simplement, vous pouvez se connecter avec votre compte Google

   ```

2. **Créez votre premier package** 📦

   ```javascript
   // Interface intuitive
   Package: "Vocabulaire Professionnel"
   Description: "Vocabulaire pour les professionnels"
   Mode de visibilité: "Public"
   ```

3. **Ajoutez vos mots** 📝

   ```
   📝 Saisie manuelle ou import Excel (xlsx, xls)
   📊 Exemples, contextuelles générées par l'API de Google Gemini-2.5-Flash
   🎯 Classification automatique par le niveau de mémorisation
   ```

4. **Commencez l'apprentissage** 🧠
   ```
   🔄 Révision espacée personnalisée
   🎮 Jeux d'apprentissage variés
   📈 Suivi de progression en temps réel
   ```

### **🎮 Modes d'Apprentissage (Spaced Repetition et flashcards)**

| Mode                   | Description            | Durée     | Efficacité |
| ---------------------- | ---------------------- | --------- | ---------- |
| 🚀 **Meaning to Word** | Apprentissage intensif | 5-10 min  | ⭐⭐⭐⭐⭐ |
| 🧠 **Word to Meaning** | Révision espacée       | 15-20 min | ⭐⭐⭐⭐⭐ |
| 🎯 **Game Mode**       | Apprentissage ludique  | 10-15 min | ⭐⭐⭐⭐   |

---

## 📊 Statistiques & Performance

### **🎯 Système de Streaks**

- **Streak Counter** : Suivi des jours consécutifs

---

## 🛡️ Sécurité & Performance

### **🔒 Sécurité Enterprise**

- ✅ **Helmet.js** : Protection des en-têtes
- ✅ **CSP** : Content Security Policy
- ✅ **DOMPurify** : Sanitization XSS
- ✅ **bcryptjs** : Hachage sécurisé
- ✅ **Rate Limiting** : Protection DDoS
- ✅ **Session Security** : Gestion sécurisée

### **⚡ Optimisations Performance**

- 🚀 **Lazy Loading** : Chargement progressif
- 📱 **Mobile-First** : Responsive design
- 📊 **Analytics** : Monitoring en temps réel

---

## 🎯 Roadmap & Développement

### **🔮 Prochaines Fonctionnalités**

| Feature                                      | Status          | ETA |
| -------------------------------------------- | --------------- | --- |
| 🌍 **Mode Hors-ligne**                       | 📋 Planifié     |
| 🎯 **Recompenses selon le niveau de streak** | 🔄 En travail   |
| 👥 **Collaboration**                         | 💡 Recherche    |
| 📱 **App Mobile**                            | 🎯 Roadmap      |
| 🧠 **IA Avancée**                            | 💡 Amélioration |

### **🤝 Contribuer**

<details>
<summary>💻 <strong>Guide de Contribution</strong></summary>

```bash
# 1. Fork le projet
git clone https://github.com/votre-username/Web_vocab_v0.git

# 2. Créer une branche feature
git checkout -b feature/nouvelle-fonctionnalite

# 3. Développer et tester
npm test
npm run lint

# 4. Commit et Push
git commit -m "✨ Ajout fonctionnalité X"
git push origin feature/nouvelle-fonctionnalite

# 5. Créer une Pull Request
```

</details>

---

## 🐛 Support & Dépannage

### **❓ FAQ Technique**

<details>
<summary>🚨 <strong>Problèmes Courants</strong></summary>

**Q: Erreur "Missing credentials for PLAIN"**

```bash
# Solution
1. Vérifiez votre .env
2. Générez un mot de passe d'application Gmail
3. Redémarrez le serveur
```

**Q: Le système de révision ne fonctionne pas**

```bash
# Vérification
1. Vérifiez la configuration de node-cron
2. Consultez les logs de learning service
3. Vérifiez les données utilisateur en base
```

**Q: Problème d'import de fichiers**

```bash
# Debug
1. Vérifiez la taille (< 5MB)
2. Format supporté: .xlsx, .xls
3. Structure: Colonne A (mot), Colonne B (définition)
```

</details>

## 📄 Licence & Crédits

### **📜 Licence**

```
This is a personal project in order to learn
```

### **🙏 Remerciements**

- **Express.js Community** : Pour le framework robuste
- **Open Source Contributors** : Pour les packages utilisés
- **Google Gemini-2.5-Flash** : Pour les définitions contextuelles
- **Uiverse.io** : Pour les UI/UX design
- **Pexels** : Pour les images
- **Printerest** : Pour les avatars
- **Learning Science Research** : Pour les principes de révision espacée
- **Beta Testers** : Pour les retours précieux

---

<div align="center">

### 🎯 **SealVo - Maîtrisez le vocabulaire avec la science**

**Made with ❤️ by the SealVo Team**

[⭐ Star ce projet](https://github.com/votre-repo/Web_vocab_v0) • [🐛 Report Issues](https://github.com/votre-repo/Web_vocab_v0/issues) • [💡 Suggest Features](https://github.com/votre-repo/Web_vocab_v0/discussions)

---

![Footer](https://img.shields.io/badge/Powered_by-Learning_Science-blue?style=for-the-badge&logo=nodedotjs)
![Footer](https://img.shields.io/badge/Built_with-❤️-red?style=for-the-badge)
![Footer](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

</div>
