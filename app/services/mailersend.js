require('dotenv').config();
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const userModel = require('../models/users');

const { MailerSend, EmailParams, Sender, Recipient } = require("mailersend");

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY,
});

const sentFrom = new Sender("Support@sealvo.it.com", "SealVo");


class MailersendService {

    //sendEmail with mailersend
    async sendEmail(user_email, content, subject = 'Révision quotidienne - SealVo') {
        try {
            const recipients = [new Recipient(user_email)];
            const emailParams = new EmailParams()
                .setFrom(sentFrom)
                .setTo(recipients)
                .setSubject(subject)
                .setHtml(content)
            const result = await mailerSend.email.send(emailParams);

            console.log(result);
            return result;

        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email:', error);
            return false;
        }
    }

    //generateEmailVerification with handlebars
    async generateEmailVerification(username, token) {
        try {
            const verificationLink = `http://${process.env.DOMAIN}/auth/verify/${token}`;

            // Lire le modèle HTML avec vérification d'existence du fichier
            const templatePath = path.join(__dirname, '../views/mails/mailVerification.hbs');
            
            if (!fs.existsSync(templatePath)) {
                throw new Error(`Le fichier template n'existe pas: ${templatePath}`);
            }
            
            const templateSource = fs.readFileSync(templatePath, 'utf8');
            
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
                verificationLink
            };
            
            const htmlContent = template(emailContext);
            
            return htmlContent; 
        } catch (error) {
            console.error('Erreur lors de la génération du contenu de l\'email:', error);
            throw error;
        }
    }

    //generateEmailContent with handlebars
    async generateEmail(allWords, totalWords, streakData, user) {
        try {
        
            // Limiter à 5 mots maximum pour l'email
            const words = allWords.map(word => {
                // Ajouter des propriétés pour faciliter l'affichage des indicateurs de difficulté
                return {
                    ...word,
                    isLevel0: word.level === 'x' ,
                    isLevel1: word.level === '0' ,
                    isLevel2: word.level === '1' ,
                    isLevel3: word.level === '2' ,
                    isLevel4: word.level === 'v' ,
                };
            });
            
            // Transformer les données de streak pour le template
            let streak = null;
            if (streakData && streakData.streak !== undefined) {
                const currentStreak = parseInt(streakData.streak) || 0;
                
                streak = {
                    currentStreak: currentStreak,
                    longestStreak: currentStreak, // En supposant que c'est le même (à remplacer par la vraie valeur si disponible)
                    isAtRisk: currentStreak > 0 && totalWords > 0, // En risque s'il y a un streak et des mots à réviser
                    isOnFire: currentStreak >= 7, // Impressionnant si 7+ jours
                    isGood: currentStreak >= 3 && currentStreak < 7 // Bon si entre 3 et 6 jours
                };
            }
            
            // Lire le modèle HTML avec vérification d'existence du fichier
            const templatePath = path.join(__dirname, '../views/mails/mail.hbs');
            
            if (!fs.existsSync(templatePath)) {
                throw new Error(`Le fichier template n'existe pas: ${templatePath}`);
            }
            
            const templateSource = fs.readFileSync(templatePath, 'utf8');
            
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
                user,
                wordCount: totalWords,
                wordsShown: words.length,
                hasMoreWords: totalWords > 5,
                words: words,
                streak,
                baseUrl: process.env.BASE_URL 
            };
            const htmlContent = template(emailContext);
            
            return htmlContent;
        } catch (error) {
            console.error('Erreur détaillée lors de la génération du contenu de l\'email:', error);
            
        }
    }

    //generateResetPasswordEmail with handlebars
    async generateResetPasswordEmail( username, token) {
        try {
            const resetPasswordLink = `http://${process.env.DOMAIN}/login/resetPassword?token=${token}`;

            // Lire le modèle HTML avec vérification d'existence du fichier
            const templatePath = path.join(__dirname, '../views/mails/mailResetPassword.hbs');
            
            if (!fs.existsSync(templatePath)) {
                throw new Error(`Le fichier template n'existe pas: ${templatePath}`);
            }
            
            const templateSource = fs.readFileSync(templatePath, 'utf8');
            
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
            
            const htmlContent = template(emailContext);
            
            return htmlContent; 
        } catch (error) {
            console.error('Erreur lors de la génération du contenu de l\'email:', error);
            throw error;
        }
    }


}

module.exports = new MailersendService();

