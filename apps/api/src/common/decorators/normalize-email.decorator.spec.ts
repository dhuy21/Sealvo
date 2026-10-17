import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IsEmail } from 'class-validator';
import { NormalizeEmail, normalizeEmail } from './normalize-email.decorator.js';

class EmailDto {
  @NormalizeEmail()
  @IsEmail()
  email!: string;
}

const transform = (email: unknown) => plainToInstance(EmailDto, { email });

describe('NormalizeEmail', () => {
  it('normalizes like express-validator normalizeEmail() with default options', () => {
    expect(transform(' John.Doe+news@GoogleMail.com ').email).toBe('johndoe@gmail.com');
    expect(transform('Jane.Doe+promo@Outlook.com').email).toBe('jane.doe@outlook.com');
    expect(transform('User.Name@Example.COM').email).toBe('user.name@example.com');
  });

  it('leaves an invalid email untouched so validation rejects it', async () => {
    const dto = transform('not-an-email');
    expect(dto.email).toBe('not-an-email');
    expect(await validate(dto)).toHaveLength(1);
  });

  it('leaves non-string values untouched', () => {
    expect(transform(42).email).toBe(42);
  });
});

describe('normalizeEmail', () => {
  it('normalizes a valid email like the decorator', () => {
    expect(normalizeEmail('Jane.Doe@GoogleMail.com')).toBe('janedoe@gmail.com');
  });

  it('returns an invalid email untouched', () => {
    expect(normalizeEmail(' not-an-email ')).toBe(' not-an-email ');
  });
});
