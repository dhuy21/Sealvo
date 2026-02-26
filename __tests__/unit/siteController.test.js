/**
 * Unit tests: SiteController (index, aboutme, feedback)
 */
const SiteController = require('../../app/controllers/SiteController');

describe('SiteController (unit)', () => {
  describe('index', () => {
    it('calls res.render with home view and Accueil title', () => {
      const req = { session: {} };
      const res = { render: jest.fn() };
      SiteController.index(req, res);
      expect(res.render).toHaveBeenCalledWith('home', {
        title: 'Accueil',
        user: undefined,
      });
    });
  });

  describe('aboutme', () => {
    it('calls res.render with aboutme view and correct title', () => {
      const req = { session: {} };
      const res = { render: jest.fn() };
      SiteController.aboutme(req, res);
      expect(res.render).toHaveBeenCalledWith('aboutme', {
        title: 'À propos de moi',
        user: undefined,
      });
    });
  });

  describe('feedback', () => {
    it('calls res.render with feedback view and correct title', () => {
      const req = { session: {} };
      const res = { render: jest.fn() };
      SiteController.feedback(req, res);
      expect(res.render).toHaveBeenCalledWith('feedback', {
        title: 'Feedback',
        user: undefined,
      });
    });
  });
});
