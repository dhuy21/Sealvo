import { plainToInstance } from 'class-transformer';
import { validate, MinLength } from 'class-validator';
import { Trim } from './trim.decorator.js';

class NameDto {
  @Trim()
  @MinLength(3)
  name!: unknown;
}

const transform = (name: unknown) => plainToInstance(NameDto, { name });

describe('Trim', () => {
  it('trims string values', () => {
    expect(transform('  john ').name).toBe('john');
  });

  it('runs before validation so padding does not count towards MinLength', async () => {
    expect(await validate(transform('  ab  '))).toHaveLength(1);
  });

  it('leaves non-string values untouched', () => {
    expect(transform(42).name).toBe(42);
    expect(transform(null).name).toBeNull();
  });
});
