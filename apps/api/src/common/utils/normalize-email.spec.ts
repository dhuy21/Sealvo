import { normalizeEmail } from './normalize-email.js';

describe('normalizeEmail', () => {
  it('normalizes a valid email with validator.js defaults', () => {
    expect(normalizeEmail('Jane.Doe@GoogleMail.com')).toBe('janedoe@gmail.com');
  });

  it('returns an invalid email untouched', () => {
    expect(normalizeEmail(' not-an-email ')).toBe(' not-an-email ');
  });
});
