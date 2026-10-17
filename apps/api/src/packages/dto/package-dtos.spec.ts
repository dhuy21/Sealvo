import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePackageDto } from './create-package.dto.js';
import { UpdatePackageDto } from './update-package.dto.js';

const invalidFields = async (cls: new () => object, body: object) =>
  (await validate(plainToInstance(cls, body))).map((e) => e.property);

describe('package DTOs', () => {
  it('trims the name and description, and rejects a blank name', async () => {
    const dto = plainToInstance(CreatePackageDto, {
      package_name: ' Basics ',
      package_description: ' A1 ',
    });
    expect([dto.package_name, dto.package_description]).toEqual(['Basics', 'A1']);
    await expect(invalidFields(CreatePackageDto, { package_name: '  ' })).resolves.toEqual([
      'package_name',
    ]);
    await expect(invalidFields(UpdatePackageDto, { package_name: ' ' })).resolves.toEqual([
      'package_name',
    ]);
  });

  it.each([CreatePackageDto, UpdatePackageDto])(
    'limits the name to 100 characters, with the old message (%o)',
    async (cls) => {
      expect(await validate(plainToInstance(cls, { package_name: 'a'.repeat(100) }))).toEqual([]);
      const [error] = await validate(plainToInstance(cls, { package_name: 'a'.repeat(101) }));
      expect(Object.values(error.constraints!)).toEqual([
        'Le nom du package ne doit pas dépasser 100 caractères',
      ]);
    },
  );

  it('rejects a null mode on create', async () => {
    await expect(
      invalidFields(CreatePackageDto, { package_name: 'A', mode: null }),
    ).resolves.toEqual(['mode']);
  });

  it('rejects a null name or mode on update, but lets null clear the description', async () => {
    await expect(
      invalidFields(UpdatePackageDto, {
        package_name: null,
        package_description: null,
        mode: null,
      }),
    ).resolves.toEqual(['package_name', 'mode']);
  });

  it('accepts every package mode', async () => {
    for (const mode of ['private', 'public', 'protected']) {
      await expect(invalidFields(UpdatePackageDto, { mode })).resolves.toEqual([]);
    }
    await expect(invalidFields(UpdatePackageDto, { mode: 'secret' })).resolves.toEqual(['mode']);
  });
});
