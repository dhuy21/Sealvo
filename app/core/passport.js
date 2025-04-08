const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/users');

// Configure local strategy for username/password authentication
passport.use(new LocalStrategy(
  {
    usernameField: 'username',
    passwordField: 'password'
  },
  async (username, password, done) => {
        try {
            const user = await User.findByUsername(username);
            // Username not found
            if (!user) {
                return done(null, false, { message: 'Incorrect username or password.' });
            }
        
            // Validate password
            const isMatch = await User.validatePassword(password, user.password);
            if (!isMatch) {
                return done(null, false, { message: 'Incorrect username or password.' });
            }
        
            // Success - return the user
            return done(null, user);
        } catch (error) {
        return done(error);
        }
    }
));    

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error);
    }
});
        

// Middleware to check if user is authenticated
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  // Not authenticated, redirect to login
  res.redirect('/login');
};

// Middleware to check if user is guest (not authenticated)
const ensureGuest = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return next();
  }
  
  // Already authenticated, redirect to home
  res.redirect('/');
};

module.exports = {
  passport,
  ensureAuthenticated,
  ensureGuest
};