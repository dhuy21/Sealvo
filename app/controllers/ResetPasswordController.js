const userModel = require('../models/users');
const resetPasswordModel = require('../models/resetPass');
const handlebars = require('handlebars');
const fs = require('fs');
const bcrypt = require('bcryptjs')
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();
//Variables d'environnement\

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for port 465, false for other ports
    auth: {
      user: process.env.USER_GMAIL,
      pass: process.env.USER_PASS,
    },
});

class ResetPasswordController {
    constructor() {
        // Bind methods to preserve 'this' context in express route handlers
        this.forgotPassword = this.forgotPassword.bind(this);
        this.forgotPasswordPost = this.forgotPasswordPost.bind(this);
        this.changePasswordPost = this.changePasswordPost.bind(this);
        this.resetPassword = this.resetPassword.bind(this);
        this.resetPasswordPost = this.resetPasswordPost.bind(this);
        this.generateResetPasswordEmail = this.generateResetPasswordEmail.bind(this);
        this.sendEmail = this.sendEmail.bind(this);
    }

    async generateResetPasswordEmail(email, token) {
        try {
            const resetPasswordLink = `http://${process.env.DOMAIN}/login/resetPassword?token=${token}`;
            const userId = await userModel.findByEmail(email);
            const username = await userModel.findUsernameById(userId);


            // Lire le modèle HTML avec vérification d'existence du fichier
            const templatePath = path.join(__dirname, '../views/mails/mailResetPassword.hbs');
            
            if (!fs.existsSync(templatePath)) {
                throw new Error(`Le fichier template n'existe pas: ${templatePath}`);
            }
            
            const templateSource = fs.readFileSync(templatePath, 'utf8');
            console.log('Template chargé, longueur:', templateSource.length);
            
            // Tenter de compiler le template avec try/catch spécifique
            let template;
            try {
                template = handlebars.compile(templateSource);
                if (typeof template !== 'function') {
                    throw new Error('Le template compilé n\'est pas une fonction');
                }
            } catch (compileError) {
                console.error('Erreur lors de la compilation du template:', compileError);
                throw compileError;
            }
            
            // Créer le contenu de l'e-mail avec les données contextuelles
            const emailContext = {
                username,
                resetPasswordLink
            };
            
            console.log('Génération du contenu HTML de l\'email de réinitialisation de mot de passe...');
            const htmlContent = template(emailContext);
            
            return htmlContent; 
        } catch (error) {
            console.error('Erreur lors de la génération du contenu de l\'email:', error);
            throw error;
        }
    }
            
            
    async sendEmail(email, content) {
        try {
            const info = await transporter.sendMail({
                from: '"SealVo" <huynguyen2182004@gmail.com>', // sender address
                to: email, // list of receivers
                subject: "Réinitialisation de mot de passe", // Subject line
                html: content
            });

            console.log(`Message sent to ${email}: ${info.messageId}`);
            return true;
        } catch (error) {
            console.error(`Erreur lors de l'envoi de l'e-mail à ${email}:`, error); 
            return false;
        }
    }
    
    // Afficher la page pour oublier le mot de passe
    forgotPassword(req, res) {
        res.render('forgotPassword', {
            title: 'Oublier le mot de passe',
            error: req.query.error,
            success: req.query.success
        });
    }

    // Traiter la soumission du formulaire pour oublier le mot de passe
    async forgotPasswordPost(req, res) {
        try {
            const { email } = req.body;
            
            // Vérifier si l'email existe dans la base de données
            const user = await userModel.findByEmail(email);
            
            if (!user) {
                return res.redirect('/login/forgotPassword?error=Cet email n\'existe pas');
            }

            // Créer un jeton de réinitialisation du mot de passe
            const { token, expiresAt } = await resetPasswordModel.createResetPasswordToken();

            // Enregistrer le jeton dans la base de données
            await resetPasswordModel.saveResetPasswordToken(email, token, expiresAt);

            // Envoyer le jeton par email
            const emailContent = await this.generateResetPasswordEmail(email, token);

            const emailSent = await this.sendEmail(email, emailContent);

            if (!emailSent) {
                return res.redirect('/login/forgotPassword?error=Une erreur est survenue. Veuillez réessayer plus tard.');
            }   

            return res.redirect('/login/forgotPassword?success=Un email a été envoyé pour réinitialiser votre mot de passe');
        } catch (error) {
            console.error('Erreur lors de la soumission du formulaire pour oublier le mot de passe:', error);
            res.redirect('/login/forgotPassword?error=Une erreur est survenue. Veuillez réessayer plus tard.');
        }
    }
    
    async changePasswordPost(req, res) {
        try {
            const email = req.session.user.email;
            
            // Vérifier si l'email existe dans la base de données
            const user = await userModel.findByEmail(email);
            
            if (!user) {
                return res.json({
                    success: false,
                    message: 'Cet email n\'existe pas'
                });
            }

            // Créer un jeton de réinitialisation du mot de passe
            const { token, expiresAt } = await resetPasswordModel.createResetPasswordToken();

            // Enregistrer le jeton dans la base de données
            await resetPasswordModel.saveResetPasswordToken(email, token, expiresAt);

            // Envoyer le jeton par email
            const emailContent = await this.generateResetPasswordEmail(email, token);

            const emailSent = await this.sendEmail(email, emailContent);

            if (!emailSent) {
                return res.json({
                    success: false,
                    message: 'Une erreur est survenue. Veuillez réessayer plus tard.'
                });
            }

            res.json({
                success: true,
                message: 'Un email a été envoyé pour réinitialiser votre mot de passe'
            });
        } catch (error) {
            console.error('Erreur lors de la soumission du formulaire pour oublier le mot de passe:', error);
            res.json({
                success: false,
                message: 'Une erreur est survenue. Veuillez réessayer plus tard.'
            });
        }

    }
    // Afficher la page pour réinitialiser le mot de passe
    resetPassword(req, res) {
        const { token } = req.query;
        res.render('resetPassword', {
            title: 'Réinitialiser le mot de passe',
            token: token,
            error: req.query.error,
            success: req.query.success
        });
    }

    // Traiter la soumission du formulaire pour réinitialiser le mot de passe
    async resetPasswordPost(req, res) {
        try {
            const { token, password, confirm_password } = req.body;

            // Vérifier si les mots de passe correspondent
            if (password !== confirm_password) {
                return res.redirect(`/login/resetPassword?token=${token}&error=Les mots de passe ne correspondent pas`);
            }

            // Vérifier si le jeton est valide
            const resetPassword = await resetPasswordModel.findByToken(token);
            if (!resetPassword) {
                return res.redirect('/login/resetPassword?error=Le jeton de réinitialisation du mot de passe n\'est pas valide');
            }

            // Vérifier si le jeton a été utilisé
            if (resetPassword.used) {
                return res.redirect('/login/resetPassword?error=Le jeton de réinitialisation du mot de passe a déjà été utilisé');
            }

            // Vérifier si le jeton a expiré
            const now = new Date();
            if (new Date(resetPassword.expires_at) < now) {
                return res.redirect('/login/resetPassword?error=Le jeton de réinitialisation du mot de passe a expiré');
            }
            // Hacher le mot de passe
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            // Mettre à jour le mot de passe
            await userModel.updatePassword(resetPassword.email, hashedPassword);

            // Marquer le jeton comme utilisé
            await resetPasswordModel.markTokenAsUsed(token);

            return res.redirect('/login?success=Votre mot de passe a été réinitialisé avec succès');

        } catch (error) {
            console.error('Erreur lors de la soumission du formulaire pour réinitialiser le mot de passe:', error);
            res.redirect('/login/resetPassword?error=Une erreur est survenue. Veuillez réessayer plus tard.');
        }
    }
}

module.exports = new ResetPasswordController();