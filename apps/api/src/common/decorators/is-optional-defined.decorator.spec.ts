import { plainToInstance } from 'class-transformer';
import { IsString, validate } from 'class-validator';
import { IsOptionalDefined } from './is-optional-defined.decorator.js';

class NoteDto {
  @IsOptionalDefined()
  @IsString()
  note?: string;
}

const errorsFor = (plain: object) => validate(plainToInstance(NoteDto, plain));

describe('IsOptionalDefined', () => {
  it('skips validation when the property is absent', async () => {
    expect(await errorsFor({})).toHaveLength(0);
  });

  it('validates a present value', async () => {
    expect(await errorsFor({ note: 'ok' })).toHaveLength(0);
    expect(await errorsFor({ note: 42 })).toHaveLength(1);
  });

  it('rejects an explicit null', async () => {
    expect(await errorsFor({ note: null })).toHaveLength(1);
  });
});
