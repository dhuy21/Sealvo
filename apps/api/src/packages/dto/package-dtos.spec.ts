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
