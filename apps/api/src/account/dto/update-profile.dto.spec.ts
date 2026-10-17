import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateProfileDto } from './update-profile.dto.js';

const check = async (plain: object) => {
  const dto = plainToInstance(UpdateProfileDto, plain);
  return { dto, errors: await validate(dto) };
};

describe('UpdateProfileDto', () => {
  it('accepts an empty body', async () => {
    expect((await check({})).errors).toHaveLength(0);
  });

  it('trims the username before checking its length', async () => {
    const { dto, errors } = await check({ username: '  john  ' });
    expect(dto.username).toBe('john');
    expect(errors).toHaveLength(0);
    expect((await check({ username: '  ab  ' })).errors).toHaveLength(1);
  });

  it('answers in French, like the old app', async () => {
    const { errors } = await check({ username: 'ab', email: 'foo', ava: 99 });
    expect(errors.flatMap((error) => [...new Set(Object.values(error.constraints!))])).toEqual([
      "Le nom d'utilisateur doit contenir entre 3 et 50 caractères",
      "Format d'email invalide",
      "L'avatar doit être un nombre entre 1 et 11",
    ]);
  });

  it.each(['username', 'email', 'current_password', 'ava'])('rejects a null %s', async (field) => {
    const { errors } = await check({ [field]: null });
    expect(errors.map((error) => error.property)).toEqual([field]);
  });
});
