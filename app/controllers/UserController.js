const bcrypt = require('bcryptjs');
const userModel = require('../models/users');
const wordModel = require('../models/words');
const learningModel = require('../models/learning');
const EmailVerificationModel = require('../models/email_verification');
const MailersendService = require('../services/mailersend');


class UserController {
    // Afficher la page de connexion
    login(req, res) {
        // Check for flash messages in session
        const flashMessage = req.session.flashMessage;
        
        // Clear the flash message from session after retrieving it
        if (flashMessage) {
            delete req.session.flashMessage;
        }
        
        res.render('login', {
            title: 'Connexion',
            flashMessage: flashMessage
        });
    }

    // Traiter la soumission du formulaire de connexion
    async loginPost(req, res) {
        try {
            const { username, password } = req.body;
            
            // Validation de base
            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Veuillez remplir tous les champs'
                });
            }

            
            // Rechercher l'utilisateur par username
            const user = await userModel.findByUsername(username);
            
            // Si l'utilisateur n'existe pas
            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: 'Nom d\'utilisateur ou mot de passe incorrect'
                });
            }
            
            // Vérifier le mot de passe
            const isMatch = await bcrypt.compare(password, user.password);
            const isVerified = user.is_verified;
            
            if (!isMatch) {
                return res.status(400).json({
                    success: false,
                    message: 'Nom d\'utilisateur ou mot de passe incorrect'
                });
            }
            
            if (!isVerified) {
                return res.status(400).json({
                    success: false,
                    message: 'Votre compte n\'est pas vérifié'
                });
            }
            
            const totalWords = await wordModel.countUserWords(user.id);
            const learnedWords = await learningModel.getNumWordsByLevelAllPackages(user.id, 'v');
            const newWords = await learningModel.getNumWordsByLevelAllPackages(user.id, 'x');
            const islearningWords = await learningModel.getNumWordsByLevelAllPackages(user.id, '0') + await learningModel.getNumWordsByLevelAllPackages(user.id, '1') + await learningModel.getNumWordsByLevelAllPackages(user.id, '2');
            const packagesToReview = await learningModel.countWordsToReviewTodayByPackage(user.id);

            // Créer une session utilisateur (sans stocker le mot de passe)
            try {
                req.session.user = {
                id: user.id,
                username: user.username, 
                streak: user.streak,
                last_login: new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(user.last_login), //convertir en date dd/mm/yyyy
                created_at: new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(user.created_at),
                email: user.email,
                avatar: user.ava,
                totalWords,
                learnedWords,
                newWords,
                islearningWords,
                packagesToReview,
                notifications: '🏅 Beginner'
                };
            } catch (error) {
                console.error('Erreur lors de la connexion:', error);
                res.status(500).json({
                    success: false,
                    message: 'Une erreur est survenue. Veuillez réessayer plus tard.'
                });
            }
            
            // Retourner le succès en JSON
            res.status(200).json({
                redirect: '/dashboard'
            });
            
        } catch (error) {
            console.error('Erreur lors de la connexion:', error);
            res.status(500).json({
                success: false,
                message: 'Une erreur est survenue. Veuillez réessayer plus tard.'
            });
        }
    }

    // Afficher la page d'inscription
    registre(req, res) {
        // Create array of avatars from 1 to 11
        const avatars = Array.from({ length: 11 }, (_, i) => `${i + 1}.png`);
        
        res.render('registre', {
            title: 'Inscription',
            avatars: avatars
        });
    }

    // Traiter la soumission du formulaire d'inscription
    async registrePost(req, res) {
        try {
            const { username, email, password, password2, avatar } = req.body;
            
            // Validation de base
            if (!username || !email || !password || !password2) {
                return res.status(400).json({
                    success: false,
                    message: 'Veuillez remplir tous les champs'
                });
            }
            
            if (password !== password2) {
                return res.status(400).json({
                    success: false,
                    message: 'Les mots de passe ne correspondent pas'
                });
            }
            
            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Le mot de passe doit contenir au moins 6 caractères'
                });
            }
            
            // Vérifier si l'username existe déjà
            const existingUserName = await userModel.findByUsername(username);
            
            if (existingUserName) {
                return res.status(400).json({
                    success: false,
                    message: 'Ce nom d\'utilisateur est déjà utilisé'
                });
            }
            
            // Vérifier si l'email existe déjà
            const existingEmail = await userModel.findByEmail(email);
            
            if (existingEmail) {
                return res.status(400).json({
                    success: false,
                    message: 'Cette adresse email est déjà utilisée'
                });
            }
            
            // Hacher le mot de passe
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            
            // Convert avatar to integer (avatar is the filename like "1.png")
            let avatarInt = 1; // Default avatar
            if (avatar) {
                // Extract the number from the filename
                const avatarNum = parseInt(avatar.replace(/\D/g, ''));
                // Ensure it's within the valid range (1-11)
                if (avatarNum >= 1 && avatarNum <= 11) {
                    avatarInt = avatarNum;
                }
            }
            
            // Créer le nouvel utilisateur
            const userId = await userModel.create({
                username,
                email,
                password: hashedPassword,
                ava: avatarInt
            });
            
            // Générer un token de vérification d'email
            const { expires_at, token, token_hash } = await EmailVerificationModel.generateToken();
            
            // Sauvegarder le token dans la base
            await EmailVerificationModel.saveToken(userId, expires_at, token_hash);
            
            // Générer l'email de vérification via le service
            const emailContent = await MailersendService.generateEmailVerification(username, token);
            const subject = "Vérification de votre email";
            // Envoyer l'email de vérification via le service
            await MailersendService.sendEmail(email, emailContent, subject);
            
            
            res.status(200).json({
                success: true,
                message: 'Un email de vérification a été envoyé à votre adresse email'
            });
            
        } catch (error) {
            console.error('Erreur lors de l\'inscription:', error);
            res.status(500).json({
                success: false,
                message: 'Une erreur est survenue. Veuillez réessayer plus tard.'
            });
        }
    }

    // Déconnexion
    async logout(req, res) {
        try {
            // Check if user session exists
            if (!req.session.user) {
                return res.redirect('/login');
            }
            
            try {
                // Update last login time
                await userModel.updateLastLogin(req.session.user.id);
            } catch (err) {
                console.error('Erreur lors de la mise à jour de la dernière connexion:', err);
                // Continue with logout even if update fails
            }
            
            // Destroy the session
            await req.session.destroy();
            
            // Redirect to homepage
            res.redirect('/');
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
            res.redirect('/dashboard?error=Une erreur est survenue. Veuillez réessayer plus tard.');
        }
    }

    // Tableau de bord (protégé)
    async dashboard(req, res) {
        // Vérifier si l'utilisateur est connecté
        if (!req.session.user) {
            console.error('session do not exist', req.session);
            return res.redirect('/login');
        }

            const user = req.session.user;
            const streak = await userModel.getStreakById(user.id);

            const totalWords = await wordModel.countUserWords(user.id);
            const learnedWords = await learningModel.getNumWordsByLevelAllPackages(user.id, 'v');
            const newWords = await learningModel.getNumWordsByLevelAllPackages(user.id, 'x');
            const islearningWords = await learningModel.getNumWordsByLevelAllPackages(user.id, '0') + await learningModel.getNumWordsByLevelAllPackages(user.id, '1') + await learningModel.getNumWordsByLevelAllPackages(user.id, '2');
            const packagesToReview = await learningModel.countWordsToReviewTodayByPackage(user.id);
            // Update session utilisateur (sans stocker le mot de passe)
            try {
                user.streak = streak.streak;
                user.totalWords = totalWords;
                user.learnedWords = learnedWords;
                user.newWords = newWords;
                user.islearningWords = islearningWords;
                user.packagesToReview = packagesToReview;
                
            } catch (error) {
                console.error('Erreur lors de la connexion:', error);
                res.redirect('/login?error=Une erreur est survenue. Veuillez réessayer plus tard.');
            }

        res.render('dashboard', {
            title: 'Tableau de bord',
            user: req.session.user,

        });
    }
    async editPost(req, res) {
        try {
            const userId = req.session.user.id;
            if (!userId) {
                return res.redirect('/login');
            }
            const data = req.body;
            await userModel.updateUserInfo(userId, data);
            
            // Update the user session data
            if (data.username) {
                req.session.user.username = data.username;
            }
            if (data.email) {
                req.session.user.email = data.email;
            }
            if (data.ava) {
                req.session.user.avatar = data.ava;
            }
            
            res.json({
                success: true,
                message: 'Informations modifiées avec succès'
            });
        } catch (error) {
            console.error('Erreur lors de la modification:', error);
            res.status(500).json({
                success: false,
                message: 'Une erreur est survenue lors de la modification des informations'
            });
        }
    }
}

module.exports = new UserController();  