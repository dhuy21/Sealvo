<div align="center">

# 🎯 Web Vocab v0 | SealVo 
### *Révolutionnez votre apprentissage du vocabulaire avec l'IA*

![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-0.1.0-blue?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=nodedotjs)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

**🚀 Une plateforme d'apprentissage intelligente qui transforme l'étude du vocabulaire en une expérience interactive et addictive !**

[🎮 Démo Live](#) • [📖 Documentation](#) • [🐛 Signaler un Bug](#) • [💡 Demander une Fonctionnalité](#)

---

</div>

## 🌟 Aperçu Rapide

> **SealVo** combine l'intelligence artificielle de Google Generative AI avec un système de révision espacée pour créer l'expérience d'apprentissage de vocabulaire la plus efficace et engageante.

### ✨ Pourquoi SealVo ?

<details>
<summary>🧠 <strong>IA Intégrée</strong> - Powered by Google Generative AI</summary>

- Génération automatique de définitions contextuelles
- Suggestions intelligentes de mots similaires
- Adaptation personnalisée au niveau de l'utilisateur
- Correction et amélioration automatique des entrées

</details>

<details>
<summary>🎮 <strong>Gamification Avancée</strong> - Learning meets Gaming</summary>

- Système de streaks avec animations visuelles
- Jeux interactifs intégrés (`/games/`)
- Défis quotidiens et récompenses
- Progress tracking avec statistiques détaillées

</details>

<details>
<summary>📦 <strong>Système de Packages</strong> - Organisez votre apprentissage</summary>

- Création de packages thématiques (`myPackages.hbs`)
- Import/Export de vocabulaire par lots
- Partage de packages entre utilisateurs
- Gestion avancée des collections

</details>

<details>
<summary>🔒 <strong>Sécurité Enterprise</strong> - Protection maximale</summary>

- Helmet.js pour les en-têtes de sécurité
- Sanitization avancée avec DOMPurify
- Content Security Policy (CSP)
- Gestion sécurisée des sessions

</details>

---

## 🎯 Fonctionnalités Principales

### 📚 **Gestion Intelligente du Vocabulaire**
```javascript
// Exemple d'ajout de mot avec IA
const word = await addWordWithAI({
  word: "serendipity",
  context: "literature",
  userLevel: "advanced"
});
// ✨ L'IA génère automatiquement définitions, exemples et synonymes
```

| Fonctionnalité | Description | Status |
|---|---|---|
| 🤖 **AI-Powered Definitions** | Génération automatique avec Google AI | ✅ |
| 📊 **Analytics Dashboard** | Tracking complet des performances | ✅ |
| 🎯 **Learning Games** | Jeux interactifs d'apprentissage | ✅ |
| 📁 **Package System** | Organisation thématique avancée | ✅ |
| 📱 **Mobile-First** | Interface responsive optimisée | ✅ |

### 🎮 **Système de Jeux Intégré**
- **Memory Cards** : Jeu de mémoire avec vos mots
- **Word Hunt** : Chasse aux mots chronométrée
- **Synonym Challenge** : Défis de synonymes
- **Speed Learning** : Apprentissage rapide gamifié

### 📦 **Gestion des Packages**
```bash
# Structure des packages
📦 Mon Package "Business English"
├── 📝 50 mots importés
├── 🎯 Difficulté: Intermédiaire
├── 📊 Progression: 75%
└── 🎮 3 jeux débloqués
```

---

## 🏗️ Architecture Technique

<details>
<summary>🔧 <strong>Stack Technologique Complète</strong></summary>

### **Backend Powerhouse**
- **Node.js** + **Express 5** : Serveur haute performance
- **MySQL2** : Base de données relationnelle optimisée
- **Google Generative AI** : Intelligence artificielle avancée
- **Handlebars** : Templates dynamiques
- **Node-cron** : Tâches automatisées

### **Frontend Moderne**
- **Vanilla JavaScript ES6+** : Performance native
- **CSS Grid/Flexbox** : Layouts responsives
- **Web APIs** : Notifications, localStorage, etc.
- **Progressive Enhancement** : Expérience dégradée gracieuse

### **Sécurité & Performance**
- **Helmet.js** : Headers de sécurité
- **DOMPurify** : Sanitization XSS
- **bcryptjs** : Hachage sécurisé
- **Morgan** : Logging des requêtes
- **Validator** : Validation des données

</details>

<details>
<summary>🏛️ <strong>Architecture MVC Avancée</strong></summary>

```
📁 SealVo Architecture
├── 🎯 app/
│   ├── 🎮 controllers/     # Logique métier
│   │   ├── api/           # API REST
│   │   ├── auth/          # Authentification
│   │   └── games/         # Contrôleurs de jeux
│   ├── 📊 models/         # Modèles de données
│   │   ├── User.js        # Gestion utilisateurs
│   │   ├── Word.js        # Vocabulaire
│   │   └── Package.js     # Système de packages
│   ├── 🛡️ middleware/     # Middleware sécurité
│   │   ├── auth.js        # Authentification
│   │   ├── sanitization.js # Nettoyage XSS
│   │   └── validation.js  # Validation données
│   ├── 🔄 services/       # Services métier
│   │   ├── aiService.js   # Google AI
│   │   ├── emailService.js # Notifications
│   │   └── gameService.js # Logique jeux
│   └── 🎨 views/          # Templates Handlebars
       ├── layouts/       # Layouts réutilisables
       ├── partials/      # Composants
       └── games/         # Interfaces de jeux
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
cp app/config/.env.example app/config/.env
nano app/config/.env  # Éditez vos variables

# 4. Démarrage immédiat
npm run dev
```

### **Configuration Avancée** 🔧

<details>
<summary>📧 <strong>Configuration Email & AI</strong></summary>

```env
# 🤖 Google Generative AI
GOOGLE_AI_API_KEY=your-google-ai-key
AI_MODEL=gemini-1.5-flash

# 📧 Configuration Email
USER_GMAIL=votre-app@gmail.com
USER_PASS=votre-mot-de-passe-app

# 🗄️ Base de Données
DB_HOST=localhost
DB_PORT=3306
DB_NAME=sealvo_db
DB_USER=root
DB_PASSWORD=votre-password

# 🔐 Sécurité
SESSION_SECRET=votre-cle-super-secrete-aleatoire
JWT_SECRET=votre-jwt-secret
BCRYPT_ROUNDS=12

# 🚀 Serveur
PORT=3000
NODE_ENV=development
```

</details>

<details>
<summary>🗄️ <strong>Configuration Base de Données</strong></summary>

```sql
-- Création automatique des tables
CREATE DATABASE sealvo_db;

-- Les tables sont créées automatiquement au démarrage
-- Vérifiez les migrations dans app/core/database.js
```

</details>

---

## 🎮 Guide d'Utilisation

### **🎯 Démarrage Rapide**

1. **Créez votre compte** 👤
   ```
   📧 Email + mot de passe sécurisé
   ✅ Vérification automatique
   🎨 Personnalisation du profil
   ```

2. **Créez votre premier package** 📦
   ```javascript
   // Interface intuitive
   Package: "Vocabulaire Professionnel"
   Catégorie: Business
   Niveau: Intermédiaire
   ```

3. **Ajoutez vos mots** 📝
   ```
   🤖 Saisie assistée par IA
   📊 Suggestions contextuelles
   🎯 Exemples automatiques
   ```

### **🎮 Modes d'Apprentissage**

| Mode | Description | Durée | Efficacité |
|------|-------------|-------|------------|
| 🚀 **Speed Learning** | Apprentissage rapide | 5-10 min | ⭐⭐⭐⭐⭐ |
| 🧠 **Memory Cards** | Répétition espacée | 15-20 min | ⭐⭐⭐⭐ |
| 🎯 **Game Mode** | Apprentissage ludique | 10-15 min | ⭐⭐⭐⭐⭐ |
| 📊 **Analytics** | Révision ciblée | Variable | ⭐⭐⭐⭐ |

---

## 📊 Statistiques & Performance

### **📈 Dashboard Avancé**
```javascript
// Exemple de métriques disponibles
const userStats = {
  totalWords: 1247,
  streakDays: 23,
  accuracy: 94.5,
  timeSpent: "2h 34m",
  favoriteCategory: "Business English",
  nextReview: "14:30"
};
```

### **🎯 Système de Streaks**
- **Streak Counter** : Suivi des jours consécutifs
- **Fire Animation** : Visualisation dynamique
- **Récompenses** : Badges et accomplissements
- **Challenges** : Défis hebdomadaires

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
- 🎯 **Caching** : Mise en cache intelligente
- 📊 **Analytics** : Monitoring en temps réel

---

## 🎯 Roadmap & Développement

### **🔮 Prochaines Fonctionnalités**

| Feature | Status | ETA |
|---------|--------|-----|
| 🎤 **Reconnaissance Vocale** | 🔄 En développement | Q1 2024 |
| 🌍 **Mode Hors-ligne** | 📋 Planifié | Q2 2024 |
| 👥 **Collaboration** | 💡 Recherche | Q3 2024 |
| 📱 **App Mobile** | 🎯 Roadmap | Q4 2024 |

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

**Q: L'IA ne fonctionne pas**
```bash
# Vérification
1. Vérifiez GOOGLE_AI_API_KEY dans .env
2. Testez la connexion API
3. Consultez les logs : npm run dev
```

**Q: Problème d'import de fichiers**
```bash
# Debug
1. Vérifiez la taille (< 5MB)
2. Format supporté: .xlsx, .xls
3. Structure: Colonne A (mot), Colonne B (définition)
```

</details>

### **📞 Support Community**

- 💬 **Discord** : [Rejoindre la communauté](#)
- 🐛 **Issues** : [Signaler un bug](#)
- 📚 **Wiki** : [Documentation complète](#)
- 📧 **Email** : support@sealvo.com

---

## 📄 Licence & Crédits

### **📜 Licence MIT**
```
Copyright (c) 2024 SealVo Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software...
```

### **🙏 Remerciements**
- **Google Generative AI** : Pour l'intelligence artificielle
- **Express.js Community** : Pour le framework robuste
- **Open Source Contributors** : Pour les packages utilisés
- **Beta Testers** : Pour les retours précieux

---

<div align="center">

### 🎯 **SealVo - Où l'apprentissage rencontre l'innovation**

**Made with ❤️ by the SealVo Team**

[⭐ Star ce projet](https://github.com/votre-repo/Web_vocab_v0) • [🐛 Report Issues](https://github.com/votre-repo/Web_vocab_v0/issues) • [💡 Suggest Features](https://github.com/votre-repo/Web_vocab_v0/discussions)

---

![Footer](https://img.shields.io/badge/Powered_by-Node.js_+_AI-blue?style=for-the-badge&logo=nodedotjs)
![Footer](https://img.shields.io/badge/Built_with-❤️-red?style=for-the-badge)
![Footer](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

</div>
