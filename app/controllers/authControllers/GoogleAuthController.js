const axios = require('axios');
const crypto = require('crypto');
const User = require('../../models/users');
const wordModel = require('../../models/words');
const learningModel = require('../../models/learning');

class GoogleAuthController {
    constructor() {
        this.clientID = process.env.GOOGLE_CLIENT_ID;
        this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        this.redirectURI = `http://${process.env.DOMAIN}/auth/google/callback`;
    }
    
    // Retourner l'URL de vérification Google
    getAuthUrl(req, res) {
        const url = 'https://accounts.google.com/o/oauth2/v2/auth';
        const params = new URLSearchParams({
            client_id: this.clientID,
            redirect_uri: this.redirectURI,
            response_type: 'code',
            scope: 'email profile',
            access_type: 'offline',
            prompt: 'consent'
        });
        
        // Rediriger vers l'URL de vérification Google
        res.redirect(`${url}?${params.toString()}`);
    }
    
    // Handle callback from Google
    async handleCallback(req, res) {
        try {
            const code = req.query.code;
            
            if (!code) {
                return res.redirect('/login?error=No code provided');
            }
            
            // Échanger le code pour obtenir un jeton
            const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
                code,
                client_id: this.clientID,
                client_secret: this.clientSecret,
                redirect_uri: this.redirectURI,
                grant_type: 'authorization_code'
            });
            
            const { access_token } = tokenResponse.data;
            
            // Récupérer les informations de l'utilisateur de Google
            const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${access_token}` }
            });
            
            const profileData = userResponse.data;
            
            // Vérifier si l'utilisateur existe déjà dans la base de données
            const user = await User.findByEmail(profileData.email);
            
            let userInfo;
            if (user) {

                console.log('Existing user logged in:', user);
                userInfo = await User.findById(user.id);

            } else {
                // Créer un nouvel utilisateur
                console.log('Creating new user from Google profile');
                
                // Créer les données de l'utilisateur nouveau
                const userData = {
                    email: profileData.email,
                    username: profileData.name,
                    password: crypto.randomBytes(16).toString('hex'),
                    ava: 1 
                };
                
                // Créer un nouvel utilisateur
                const newUserId = await User.create(userData);
                console.log('New user created with ID:', newUserId);

                // Prendre les informations de l'utilisateur nouvellement créé
                userInfo = await User.findById(newUserId); 
            }
            
            const totalWords = await wordModel.countUserWords(userInfo.id);
            const learnedWords = await learningModel.getNumWordsByLevel(userInfo.id, 'v');
            const newWords = await learningModel.getNumWordsByLevel(userInfo.id, 'x');
            const islearningWords = await learningModel.getNumWordsByLevel(userInfo.id, '0') + await learningModel.getNumWordsByLevel(userInfo.id, '1') + await learningModel.getNumWordsByLevel(userInfo.id, '2');
            console.log('islearningWords', islearningWords);
            
            // Créer une session utilisateur (sans stocker le mot de passe)
            req.session.user = {
                    id: userInfo.id,
                    username: userInfo.username, 
                    streak: userInfo.streak,
                    last_login: userInfo.last_login, //convertir en date dd/mm/yyyy
                    created_at: userInfo.created_at,
                    email: userInfo.email,
                    avatar: userInfo.ava,
                    totalWords,
                    learnedWords,
                    newWords,
                    islearningWords
            };

            // Rediriger vers le tableau de bord
             res.redirect('/dashboard');

        } catch (error) {
            console.error('Google authentication error:', error);
            return res.redirect('/login?error=Authentication failed');
            
        }
    }
}

module.exports = new GoogleAuthController(); 