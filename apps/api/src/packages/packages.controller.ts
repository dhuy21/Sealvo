import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PackageOwnershipGuard } from '../auth/guards/package-ownership.guard.js';
import { PackageReadGuard } from '../auth/guards/package-read.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { PackagesService } from './packages.service.js';
import { CreatePackageDto } from './dto/create-package.dto.js';
import { UpdatePackageDto } from './dto/update-package.dto.js';
import { InvalidateDashboardInterceptor } from '../common/interceptors/invalidate-dashboard.interceptor.js';

@ApiTags('Packages')
@Controller('packages')
@UseInterceptors(InvalidateDashboardInterceptor)
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user's packages" })
  @ApiResponse({ status: 200, description: 'List of user packages' })
  async findMine(@CurrentUser('id') userId: string) {
    return this.packagesService.findByUserId(userId);
  }

  @Get('public')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all public and protected packages' })
  @ApiResponse({ status: 200, description: 'List of public packages' })
  async findPublic() {
    return this.packagesService.findPublicPackages();
  }

  @Get(':packageId')
  @UseGuards(JwtAuthGuard, PackageReadGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a package (owner, or anyone for public/protected)' })
  @ApiResponse({ status: 200, description: 'Package with owner username and isOwner flag' })
  @ApiResponse({ status: 403, description: 'Private package of another user' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  async findOne(
    @Param('packageId', ParseIntPipe) packageId: number,
    @CurrentUser('id') userId: string,
  ) {
    return this.packagesService.findOne(packageId, userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new package' })
  @ApiResponse({ status: 201, description: 'Package created' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreatePackageDto) {
    return this.packagesService.create(userId, dto);
  }

  @Patch(':packageId')
  @UseGuards(JwtAuthGuard, PackageOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a package' })
  @ApiResponse({ status: 200, description: 'Package updated' })
  @ApiResponse({ status: 403, description: 'Not owner' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  async update(@Param('packageId', ParseIntPipe) packageId: number, @Body() dto: UpdatePackageDto) {
    return this.packagesService.update(packageId, dto);
  }

  @Delete(':packageId')
  @UseGuards(JwtAuthGuard, PackageOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a package' })
  @ApiResponse({ status: 200, description: 'Package deleted' })
  @ApiResponse({ status: 403, description: 'Not owner' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  async delete(@Param('packageId', ParseIntPipe) packageId: number) {
    return this.packagesService.delete(packageId);
  }

  @Patch(':packageId/toggle')
  @UseGuards(JwtAuthGuard, PackageOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle package activation' })
  @ApiResponse({ status: 200, description: 'Activation toggled' })
  @ApiResponse({ status: 403, description: 'Not owner' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  async toggle(@Param('packageId', ParseIntPipe) packageId: number) {
    return this.packagesService.toggleActivation(packageId);
  }

  @Post(':packageId/copy')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Copy a public package to own collection' })
  @ApiResponse({ status: 201, description: 'Package copied' })
  @ApiResponse({ status: 403, description: 'Package is not public' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  async copy(
    @Param('packageId', ParseIntPipe) packageId: number,
    @CurrentUser('id') userId: string,
  ) {
    return this.packagesService.copyPublicPackage(packageId, userId);
  }
}
