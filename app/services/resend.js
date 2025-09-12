const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

class ResendService {

    async sendEmail(user_email, content, subject = 'Révision quotidienne - SealVo') {
        try {
    
            const result = await resend.emails.send({
                from: 'SealVo <no-reply@sealvo.it.com>',
                to: [user_email],
                subject: subject,
                html: content,
            });

            console.log(result);
            return result;
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email:', error);
            throw error;
        }
    }
}

module.exports = new ResendService();