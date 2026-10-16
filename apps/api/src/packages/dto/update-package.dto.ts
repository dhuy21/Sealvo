import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdatePackageDto {
  @ApiProperty({ example: 'English Advanced', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  package_name?: string;

  @ApiProperty({ example: 'Advanced vocabulary', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  package_description?: string;

  @ApiProperty({ enum: ['private', 'public', 'protected'], required: false })
  @IsOptional()
  @IsEnum(['private', 'public', 'protected'] as const)
  mode?: 'private' | 'public' | 'protected';
}
