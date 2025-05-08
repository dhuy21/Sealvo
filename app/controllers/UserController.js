const bcrypt = require('bcryptjs');
const userModel = require('../models/users');
const wordModel = require('../models/words');
const learningModel = require('../models/learning');


class UserController {
    // Afficher la page de connexion
    login(req, res) {
        res.render('login', {
            title: 'Connexion',
            error: req.query.error,
            success: req.query.success
        });
    }

    // Traiter la soumission du formulaire de connexion
    async loginPost(req, res) {
        try {
            const { username, password } = req.body;
            
            // Validation de base
            if (!username || !password) {
                return res.redirect('/login?error=Veuillez remplir tous les champs');
            }

            
            // Rechercher l'utilisateur par username
            const user = await userModel.findByUsername(username);
            
            // Si l'utilisateur n'existe pas
            if (!user) {
                return res.redirect('/login?error=Nom d\'utilisateur ou mot de passe incorrect');
            }
            
            // Vérifier le mot de passe
            const isMatch = await bcrypt.compare(password, user.password);
            
            if (!isMatch) {
                return res.redirect('/login?error=Nom d\'utilisateur ou mot de passe incorrect');
            }
            
            const totalWords = await wordModel.countUserWords(user.id);
            const learnedWords = await learningModel.getNumWordsByLevel(user.id, 'v');
            const newWords = await learningModel.getNumWordsByLevel(user.id, 'x');
            const islearningWords = await learningModel.getNumWordsByLevel(user.id, '0') + await learningModel.getNumWordsByLevel(user.id, '1') + await learningModel.getNumWordsByLevel(user.id, '2');
            console.log('islearningWords', islearningWords);
            // Créer une session utilisateur (sans stocker le mot de passe)
            req.session.user = {
                id: user.id,
                username: user.username, 
                streak: user.streak,
                last_login: user.last_login, //convertir en date dd/mm/yyyy
                created_at: user.created_at,
                email: user.email,
                avatar: user.ava,
                totalWords,
                learnedWords,
                newWords,
                islearningWords
            };
            
            // Rediriger vers le tableau de bord
            res.redirect('/dashboard');
            
        } catch (error) {
            console.error('Erreur lors de la connexion:', error);
            res.redirect('/login?error=Une erreur est survenue. Veuillez réessayer plus tard.');
        }
    }

    // Afficher la page d'inscription
    registre(req, res) {
        // Create array of avatars from 1 to 11
        const avatars = Array.from({ length: 11 }, (_, i) => `${i + 1}.png`);
        
        res.render('registre', {
            title: 'Inscription',
            error: req.query.error,
            avatars: avatars
        });
    }

    // Traiter la soumission du formulaire d'inscription
    async registrePost(req, res) {
        try {
            const { username, email, password, password2, avatar } = req.body;
            
            // Validation de base
            if (!username || !email || !password || !password2) {
                return res.redirect('/registre?error=Veuillez remplir tous les champs');
            }
            
            if (password !== password2) {
                return res.redirect('/registre?error=Les mots de passe ne correspondent pas');
            }
            
            if (password.length < 6) {
                return res.redirect('/registre?error=Le mot de passe doit contenir au moins 6 caractères');
            }
            
            // Vérifier si l'username existe déjà
            const existingUser = await userModel.findByUsername(username);
            
            if (existingUser) {
                return res.redirect('/registre?error=Ce nom d\'utilisateur est déjà utilisé');
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
            await userModel.create({
                username,
                email,
                password: hashedPassword,
                ava: avatarInt
            });
            
            // Rediriger vers la page de connexion
            res.redirect('/login?success=Votre compte a été créé avec succès');
            
        } catch (error) {
            console.error('Erreur lors de l\'inscription:', error);
            res.redirect('/registre?error=Une erreur est survenue. Veuillez réessayer plus tard.');
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
    dashboard(req, res) {
        // Vérifier si l'utilisateur est connecté
        if (!req.session.user) {
            return res.redirect('/login?error=Vous devez être connecté pour accéder à cette page');
        }
        
        res.render('dashboard', {
            title: 'Tableau de bord',
            user: req.session.user
        });
    }
    async editPost(req, res) {
        try {
            const userId = req.session.user.id;
            if (!userId) {
                return res.redirect('/login?error=Vous devez être connecté pour accéder à cette page');
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