import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdatePackageDto {
  @ApiProperty({ example: 'English Advanced', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  package_name?: string;

  @ApiProperty({ example: 'Advanced vocabulary', required: false })
  @IsOptional()
  @IsString()
  package_description?: string;

  @ApiProperty({ enum: ['private', 'public', 'protected'], required: false })
  @IsOptional()
  @IsEnum(['private', 'public', 'protected'] as const)
  mode?: 'private' | 'public' | 'protected';
}
