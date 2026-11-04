import { emailLookupForms, normalizeEmail, preferredStoredEmail } from './normalize-email.js';

describe('normalizeEmail', () => {
  it('normalizes a valid email with validator.js defaults', () => {
    expect(normalizeEmail('Jane.Doe@GoogleMail.com')).toBe('janedoe@gmail.com');
  });

  it('looks up the typed form and the normalized form, and prefers the normalized row', () => {
    expect(emailLookupForms('Jane.Doe@gmail.com')).toEqual([
      'Jane.Doe@gmail.com',
      'janedoe@gmail.com',
    ]);
    expect(emailLookupForms('janedoe@gmail.com')).toEqual(['janedoe@gmail.com']);
    expect(
      preferredStoredEmail('Jane.Doe@gmail.com', [
        { id: 'raw', email: 'Jane.Doe@gmail.com' },
        { id: 'norm', email: 'janedoe@gmail.com' },
      ])?.id,
    ).toBe('norm');
  });

  it('returns an invalid email untouched', () => {
    expect(normalizeEmail(' not-an-email ')).toBe(' not-an-email ');
  });
});
