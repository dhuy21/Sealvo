const axios = require('axios');
const crypto = require('crypto');
const User = require('../../models/users');
const wordModel = require('../../models/words');
const learningModel = require('../../models/learning');
const { setFlash } = require('../../middleware/flash');

class GoogleAuthController {
  constructor() {
    this.clientID = process.env.GOOGLE_CLIENT_ID;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    this.redirectURI = `http://${process.env.DOMAIN}/auth/google/callback`;
  }

  getAuthUrl(req, res) {
    const url = 'https://accounts.google.com/o/oauth2/v2/auth';
    const params = new URLSearchParams({
      client_id: this.clientID,
      redirect_uri: this.redirectURI,
      response_type: 'code',
      scope: 'email profile',
      access_type: 'offline',
      prompt: 'consent',
    });

    res.redirect(`${url}?${params.toString()}`);
  }

  async handleCallback(req, res) {
    try {
      const code = req.query.code;

      if (!code) {
        setFlash(req, 'error', 'No code provided');
        return res.redirect('/login');
      }

      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: this.clientID,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectURI,
        grant_type: 'authorization_code',
      });

      const { access_token } = tokenResponse.data;

      const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const profileData = userResponse.data;

      const user = await User.findByEmail(profileData.email);

      let userInfo;
      if (user) {
        userInfo = await User.findById(user.id);
      } else {
        const userData = {
          email: profileData.email,
          username: profileData.name,
          password: crypto.randomBytes(16).toString('hex'),
          ava: 1,
        };

        const newUserId = await User.create(userData);
        userInfo = await User.findById(newUserId);
      }

      const totalWords = await wordModel.countUserWords(userInfo.id);
      const learnedWords = await learningModel.getNumWordsByLevelAllPackages(userInfo.id, 'v');
      const newWords = await learningModel.getNumWordsByLevelAllPackages(userInfo.id, 'x');
      const islearningWords =
        (await learningModel.getNumWordsByLevelAllPackages(userInfo.id, '0')) +
        (await learningModel.getNumWordsByLevelAllPackages(userInfo.id, '1')) +
        (await learningModel.getNumWordsByLevelAllPackages(userInfo.id, '2'));

      // Créer une session utilisateur (sans stocker le mot de passe)
      req.session.user = {
        id: userInfo.id,
        username: userInfo.username,
        streak: userInfo.streak,
        last_login: userInfo.last_login,
        created_at: userInfo.created_at,
        email: userInfo.email,
        avatar: userInfo.ava,
        totalWords,
        learnedWords,
        newWords,
        islearningWords,
      };

      res.redirect('/dashboard');
    } catch (error) {
      console.error('Google authentication error:', error);
      setFlash(req, 'error', 'Authentication failed');
      return res.redirect('/login');
    }
  }
}

module.exports = new GoogleAuthController();
