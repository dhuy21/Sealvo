import { plainToInstance, type ClassConstructor } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto.js';
import { RegisterDto } from './register.dto.js';
import { ResendVerificationDto } from './resend-verification.dto.js';
import { ResetPasswordDto } from './reset-password.dto.js';

async function check<T extends object>(cls: ClassConstructor<T>, plain: object) {
  const dto = plainToInstance(cls, plain);
  const errors = await validate(dto);
  return { dto, messages: errors.flatMap((error) => Object.values(error.constraints ?? {})) };
}

const USERNAME_LENGTH_MESSAGE = "Le nom d'utilisateur doit contenir entre 3 et 50 caractères";

describe('auth DTOs', () => {
  describe('RegisterDto', () => {
    const valid = { username: 'john', email: 'john@example.com', password: 'secret' };

    it('trims the username before checking its length', async () => {
      expect((await check(RegisterDto, { ...valid, username: '  john  ' })).dto.username).toBe(
        'john',
      );
      expect((await check(RegisterDto, { ...valid, username: '  ab  ' })).messages).toEqual([
        USERNAME_LENGTH_MESSAGE,
      ]);
    });

    it('accepts a missing avatar but rejects null and out-of-range values', async () => {
      expect((await check(RegisterDto, valid)).messages).toEqual([]);
      expect((await check(RegisterDto, { ...valid, avatar: null })).messages).not.toEqual([]);
      expect((await check(RegisterDto, { ...valid, avatar: 12 })).messages).not.toEqual([]);
    });

    it('rejects a password bcrypt would truncate (over 72 bytes, accents count double)', async () => {
      expect((await check(RegisterDto, { ...valid, password: 'a'.repeat(72) })).messages).toEqual(
        [],
      );
      expect((await check(RegisterDto, { ...valid, password: 'é'.repeat(37) })).messages).toEqual([
        'Le mot de passe est trop long',
      ]);
    });
  });

  it('ResetPasswordDto rejects a password over 72 bytes', async () => {
    const { messages } = await check(ResetPasswordDto, { token: 't', password: 'a'.repeat(73) });
    expect(messages).toEqual(['Le mot de passe est trop long']);
  });

  it('LoginDto trims the username', async () => {
    const { dto, messages } = await check(LoginDto, { username: ' john ', password: 'x' });
    expect(dto.username).toBe('john');
    expect(messages).toEqual([]);
  });

  describe('ResendVerificationDto', () => {
    it('trims the username', async () => {
      const { dto, messages } = await check(ResendVerificationDto, { username: ' john ' });
      expect(dto.username).toBe('john');
      expect(messages).toEqual([]);
    });

    it.each([['  ab '], ['a'.repeat(51)]])('rejects %j', async (username) => {
      expect((await check(ResendVerificationDto, { username })).messages).toEqual([
        USERNAME_LENGTH_MESSAGE,
      ]);
    });
  });
});
