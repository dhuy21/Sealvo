const bcrypt = require('bcryptjs');
const userModel = require('../models/users');
const wordModel = require('../models/words');
const learningModel = require('../models/learning');
const EmailVerificationModel = require('../models/email_verification');
const MailersendService = require('../services/mailersend');
const { setFlash } = require('../middleware/flash');
const { isProductionLike } = require('../config/environment');

class UserController {
  login(req, res) {
    res.render('login', { title: 'Connexion' });
  }

  async loginPost(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Veuillez remplir tous les champs',
        });
      }

      const user = await userModel.findByUsername(username);

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Nom d'utilisateur ou mot de passe incorrect",
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      const isVerified = user.is_verified;

      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Nom d'utilisateur ou mot de passe incorrect",
        });
      }

      if (!isVerified) {
        return res.status(400).json({
          success: false,
          message: "Votre compte n'est pas vérifié",
        });
      }

      const totalWords = await wordModel.countUserWords(user.id);
      const learnedWords = await learningModel.getNumWordsByLevelAllPackages(user.id, 'v');
      const newWords = await learningModel.getNumWordsByLevelAllPackages(user.id, 'x');
      const islearningWords =
        (await learningModel.getNumWordsByLevelAllPackages(user.id, '0')) +
        (await learningModel.getNumWordsByLevelAllPackages(user.id, '1')) +
        (await learningModel.getNumWordsByLevelAllPackages(user.id, '2'));
      const packagesToReview = await learningModel.countWordsToReviewTodayByPackage(user.id);

      try {
        req.session.user = {
          id: user.id,
          username: user.username,
          streak: user.streak,
          last_login: new Intl.DateTimeFormat('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }).format(user.last_login),
          created_at: new Intl.DateTimeFormat('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }).format(user.created_at),
          email: user.email,
          avatar: user.ava,
          totalWords,
          learnedWords,
          newWords,
          islearningWords,
          packagesToReview,
          notifications: '🏅 Beginner',
        };
      } catch (error) {
        console.error('Session creation error:', error);
        res.status(500).json({
          success: false,
          message: 'Une erreur est survenue. Veuillez réessayer plus tard.',
        });
      }

      res.status(200).json({ redirect: '/dashboard' });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Une erreur est survenue. Veuillez réessayer plus tard.',
      });
    }
  }

  registre(req, res) {
    const avatars = Array.from({ length: 11 }, (_, i) => `${i + 1}.png`);
    res.render('registre', { title: 'Inscription', avatars });
  }

  async registrePost(req, res) {
    try {
      const { username, email, password, password2, avatar } = req.body;

      if (!username || !email || !password || !password2) {
        return res.status(400).json({
          success: false,
          message: 'Veuillez remplir tous les champs',
        });
      }

      if (password !== password2) {
        return res.status(400).json({
          success: false,
          message: 'Les mots de passe ne correspondent pas',
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Le mot de passe doit contenir au moins 6 caractères',
        });
      }

      const existingUserName = await userModel.findByUsername(username);
      if (existingUserName) {
        return res.status(400).json({
          success: false,
          message: "Ce nom d'utilisateur est déjà utilisé",
        });
      }

      const existingEmail = await userModel.findByEmail(email);
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Cette adresse email est déjà utilisée',
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      let avatarInt = 1;
      if (avatar) {
        const avatarNum = parseInt(avatar.replace(/\D/g, ''));
        if (avatarNum >= 1 && avatarNum <= 11) avatarInt = avatarNum;
      }

      const userId = await userModel.create({
        username,
        email,
        password: hashedPassword,
        ava: avatarInt,
      });

      const { expires_at, token, token_hash } = await EmailVerificationModel.generateToken();
      await EmailVerificationModel.saveToken(userId, expires_at, token_hash);

      const emailContent = await MailersendService.generateEmailVerification(username, token);
      await MailersendService.sendEmail(email, emailContent, 'Vérification de votre email');

      res.status(200).json({
        success: true,
        message: 'Un email de vérification a été envoyé à votre adresse email',
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Une erreur est survenue. Veuillez réessayer plus tard.',
      });
    }
  }

  async logout(req, res) {
    try {
      if (!req.session.user) return res.redirect('/login');

      try {
        await userModel.updateLastLogin(req.session.user.id);
      } catch (err) {
        console.error('Failed to update last login:', err);
      }

      await req.session.destroy();

      // Options must match session config so the client removes the cookie
      res.clearCookie('connect.sid', {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: isProductionLike(),
      });

      res.redirect('/');
    } catch (error) {
      console.error('Logout error:', error);
      setFlash(req, 'error', 'Une erreur est survenue. Veuillez réessayer plus tard.');
      res.redirect('/login');
    }
  }

  async dashboard(req, res) {
    if (!req.session.user) {
      console.error('No active session', req.session);
      return res.redirect('/login');
    }

    const user = req.session.user;
    const streak = await userModel.getStreakById(user.id);

    const totalWords = await wordModel.countUserWords(user.id);
    const learnedWords = await learningModel.getNumWordsByLevelAllPackages(user.id, 'v');
    const newWords = await learningModel.getNumWordsByLevelAllPackages(user.id, 'x');
    const islearningWords =
      (await learningModel.getNumWordsByLevelAllPackages(user.id, '0')) +
      (await learningModel.getNumWordsByLevelAllPackages(user.id, '1')) +
      (await learningModel.getNumWordsByLevelAllPackages(user.id, '2'));
    const packagesToReview = await learningModel.countWordsToReviewTodayByPackage(user.id);

    try {
      user.streak = streak.streak;
      user.totalWords = totalWords;
      user.learnedWords = learnedWords;
      user.newWords = newWords;
      user.islearningWords = islearningWords;
      user.packagesToReview = packagesToReview;
    } catch (error) {
      console.error('Dashboard data error:', error);
      setFlash(req, 'error', 'Une erreur est survenue. Veuillez réessayer plus tard.');
      return res.redirect('/login');
    }

    res.render('dashboard', { title: 'Tableau de bord', user: req.session.user });
  }

  async editPost(req, res) {
    try {
      const userId = req.session.user.id;
      if (!userId) return res.redirect('/login');

      const data = req.body;
      await userModel.updateUserInfo(userId, data);

      if (data.username) req.session.user.username = data.username;
      if (data.email) req.session.user.email = data.email;
      if (data.ava) req.session.user.avatar = data.ava;

      res.json({ success: true, message: 'Informations modifiées avec succès' });
    } catch (error) {
      console.error('Edit error:', error);
      res.status(500).json({
        success: false,
        message: 'Une erreur est survenue lors de la modification des informations',
      });
    }
  }
}

module.exports = new UserController();
