import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';

const PRISMA_ERRORS: Record<string, () => HttpException> = {
  P2000: () => new BadRequestException('Une valeur fournie est trop longue.'),
  P2002: () => new ConflictException('Cette ressource existe déjà.'),
  P2025: () => new NotFoundException('Ressource introuvable.'),
};

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const mapped = PRISMA_ERRORS[exception.code];
    super.catch(mapped ? mapped() : exception, host);
  }
}
