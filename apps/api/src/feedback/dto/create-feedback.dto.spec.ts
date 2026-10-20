import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateFeedbackDto } from './create-feedback.dto.js';

const valid = { type: 'bug', subject: 'Sujet', content: 'Contenu' };

const check = async (plain: object) => {
  const dto = plainToInstance(CreateFeedbackDto, plain);
  const errors = await validate(dto);
  return { dto, messages: errors.flatMap((error) => Object.values(error.constraints ?? {})) };
};

describe('CreateFeedbackDto', () => {
  it('trims subject, content and email', async () => {
    const { dto, messages } = await check({
      type: 'bug',
      subject: '  Sujet ',
      content: '\nContenu  ',
      email: ' a@b.co ',
    });
    expect(messages).toEqual([]);
    expect(dto).toMatchObject({ subject: 'Sujet', content: 'Contenu', email: 'a@b.co' });
  });

  it('rejects a whitespace-only subject or content', async () => {
    expect((await check({ ...valid, subject: '   ' })).messages).toEqual(['Le sujet est requis']);
    expect((await check({ ...valid, content: ' \n ' })).messages).toEqual([
      'Le contenu est requis',
    ]);
  });

  it('caps subject at 255 and content at 5000 characters', async () => {
    const atLimit = await check({ ...valid, subject: 'a'.repeat(255), content: 'a'.repeat(5000) });
    expect(atLimit.messages).toEqual([]);
    expect((await check({ ...valid, subject: 'a'.repeat(256) })).messages).toEqual([
      'Le sujet ne doit pas dépasser 255 caractères',
    ]);
    expect((await check({ ...valid, content: 'a'.repeat(5001) })).messages).toEqual([
      'Le contenu ne doit pas dépasser 5000 caractères',
    ]);
  });

  it('treats a blank email as absent but rejects null and invalid emails', async () => {
    const blank = await check({ ...valid, email: '  ' });
    expect(blank.messages).toEqual([]);
    expect(blank.dto.email).toBeUndefined();
    expect((await check({ ...valid, email: null })).messages).toEqual(["Format d'email invalide"]);
    expect((await check({ ...valid, email: 'nope' })).messages).toEqual([
      "Format d'email invalide",
    ]);
  });
});
