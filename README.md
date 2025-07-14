<div align="center">

# 🎯 Web Vocab v0 | SealVo 
### *Révolutionnez votre apprentissage du vocabulaire avec la révision espacée*

![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-0.1.0-blue?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=nodedotjs)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

**🚀 Une plateforme d'apprentissage moderne qui transforme l'étude du vocabulaire en une expérience interactive et motivante !**

[🎮 Démo Live](https://sealvo.it.com) • [📖 Documentation](#) • [🐛 Signaler un Bug](https://) • [💡 Demander une Fonctionnalité](#)

---

</div>

## 🌟 Aperçu Rapide

> **SealVo** est une application web moderne qui combine un système de révision espacée intelligent avec une interface gamifiée pour créer l'expérience d'apprentissage de vocabulaire la plus efficace et engageante.

### ✨ Pourquoi SealVo ?

<details>
<summary>🎯 <strong>Révision Espacée Intelligente</strong> - Mémorisation optimisée</summary>

- Algorithme de répétition espacée personnalisé
- Adaptation automatique selon vos performances
- Rappels intelligents pour optimiser la rétention
- Suivi des intervalles de révision optimaux

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
<summary>🔒 <strong>Sécurité & Performance</strong> - Protection maximale</summary>

- Helmet.js pour les en-têtes de sécurité
- Sanitization avancée avec DOMPurify
- Content Security Policy (CSP)
- Gestion sécurisée des sessions

</details>

---

## 🎯 Fonctionnalités Principales

### 📚 **Gestion Avancée du Vocabulaire**
```javascript
// Exemple d'ajout de mot avec contexte
const word = await addWord({
  word: "serendipity",
  definition: "Pleasant surprise or fortunate discovery",
  context: "literature",
  difficulty: "advanced",
  package: "Advanced English"
});
// ✨ Intégration automatique dans le système de révision
```

| Fonctionnalité | Description | Status |
|---|---|---|
| 📊 **Analytics Dashboard** | Tracking complet des performances | ✅ |
| 🎯 **Learning Games** | Jeux interactifs d'apprentissage | ✅ |
| 📁 **Package System** | Organisation thématique avancée | ✅ |
| 🔄 **Spaced Repetition** | Système de révision espacée | ✅ |
| 📱 **Mobile-First** | Interface responsive optimisée | ✅ |
| 🤖 **AI Assistance** | Aide optionnelle pour définitions | 🔄 |

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
├── 🔄 Prochaine révision: 2h
└── 🎮 3 jeux débloqués
```

### 🧠 **Système de Révision Espacée**
- **Algorithme adaptatif** : Intervalles personnalisés selon vos performances
- **Courbe d'oubli** : Optimisation basée sur la recherche scientifique
- **Rappels intelligents** : Notifications au moment optimal
- **Suivi de progression** : Visualisation de votre amélioration

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

### **Outils Optionnels**
- **Google Generative AI** : Assistance pour définitions (optionnel)
- **PDF-lib** : Traitement des fichiers PDF
- **XLSX** : Import/Export Excel

</details>

<details>
<summary>🏛️ <strong>Architecture MVC Avancée</strong></summary>

```
📁 SealVo Architecture
├── 🎯 app/
│   ├── 🎮 controllers/     # Logique métier
│   │   ├── apiControllers/ # API REST
│   │   ├── SiteController.js # Pages principales
│   │   └── LearningController.js # Système d'apprentissage
│   ├── 📊 models/         # Modèles de données
│   │   ├── User.js        # Gestion utilisateurs
│   │   ├── Word.js        # Vocabulaire
│   │   ├── Package.js     # Système de packages
│   │   └── Learning.js    # Révision espacée
│   ├── 🛡️ middleware/     # Middleware sécurité
│   │   ├── auth.js        # Authentification
│   │   ├── sanitization.js # Nettoyage XSS
│   │   └── validation.js  # Validation données
│   ├── 🔄 services/       # Services métier
│   │   ├── learningService.js # Algorithme révision
│   │   ├── emailService.js    # Notifications
│   │   └── gameService.js     # Logique jeux
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
<summary>📧 <strong>Configuration Email & Base de Données</strong></summary>

```env
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

# 🤖 IA (Optionnel)
GOOGLE_AI_API_KEY=your-google-ai-key  # Optionnel pour assistance IA
AI_MODEL=gemini-1.5-flash
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
   Objectif: 50 mots/semaine
   ```

3. **Ajoutez vos mots** 📝
   ```
   📝 Saisie manuelle ou import Excel
   📊 Définitions contextuelles
   🎯 Classification automatique par difficulté
   ```

4. **Commencez l'apprentissage** 🧠
   ```
   🔄 Révision espacée personnalisée
   🎮 Jeux d'apprentissage variés
   📈 Suivi de progression en temps réel
   ```

### **🎮 Modes d'Apprentissage**

| Mode | Description | Durée | Efficacité |
|------|-------------|-------|------------|
| 🚀 **Speed Learning** | Apprentissage intensif | 5-10 min | ⭐⭐⭐⭐⭐ |
| 🧠 **Spaced Repetition** | Révision espacée | 15-20 min | ⭐⭐⭐⭐⭐ |
| 🎯 **Game Mode** | Apprentissage ludique | 10-15 min | ⭐⭐⭐⭐ |
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
  favoritePackage: "Business English",
  nextReview: "14:30",
  completionRate: 87.3
};
```

### **🎯 Système de Streaks**
- **Streak Counter** : Suivi des jours consécutifs
- **Fire Animation** : Visualisation dynamique
- **Récompenses** : Badges et accomplissements
- **Challenges** : Défis hebdomadaires

### **📊 Métriques d'Apprentissage**
- **Courbe de progression** : Visualisation de l'amélioration
- **Temps de réponse** : Analyse de la vitesse
- **Taux de rétention** : Efficacité de la mémorisation
- **Mots maîtrisés** : Suivi des acquis

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
| 🧠 **IA Avancée** | 💡 Amélioration | Q2 2024 |

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
- **Express.js Community** : Pour le framework robuste
- **Open Source Contributors** : Pour les packages utilisés
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
