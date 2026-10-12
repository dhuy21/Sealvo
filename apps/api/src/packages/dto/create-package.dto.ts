import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePackageDto {
  @ApiProperty({ example: 'English Basics' })
  @IsString()
  @MinLength(1)
  package_name!: string;

  @ApiProperty({ example: 'Basic vocabulary for beginners', required: false })
  @IsOptional()
  @IsString()
  package_description?: string;

  @ApiProperty({ enum: ['private', 'public', 'protected'], default: 'private' })
  @IsOptional()
  @IsEnum(['private', 'public', 'protected'] as const)
  mode?: 'private' | 'public' | 'protected';
}
