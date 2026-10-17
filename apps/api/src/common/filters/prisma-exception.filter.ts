import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  HttpException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';

const PRISMA_ERRORS: Record<string, () => HttpException> = {
  P2000: () => new BadRequestException('Une valeur fournie est trop longue.'),
  P2002: () => new ConflictException('Cette ressource existe déjà.'),
  P2025: () => new NotFoundException('Ressource introuvable.'),
};

/**
 * MySQL 3819: a CHECK constraint rejected the row. Prisma has no code for it: raw queries
 * report it as P2010 with the MySQL code in `meta`, model queries only in the message.
 */
function isCheckViolation(
  exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientUnknownRequestError,
): boolean {
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    return exception.code === 'P2010' && exception.meta?.code === '3819';
  }
  return /\bcode: 3819\b/.test(exception.message);
}

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientValidationError,
)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception:
      | Prisma.PrismaClientKnownRequestError
      | Prisma.PrismaClientUnknownRequestError
      | Prisma.PrismaClientValidationError,
    host: ArgumentsHost,
  ) {
    if (exception instanceof Prisma.PrismaClientValidationError || isCheckViolation(exception)) {
      // The message describes the query: logged for debugging, never sent to the client
      this.logger.warn(exception.message);
      return super.catch(new BadRequestException('Données invalides.'), host);
    }
    if (exception instanceof Prisma.PrismaClientUnknownRequestError) {
      return super.catch(exception, host);
    }
    const mapped = PRISMA_ERRORS[exception.code];
    super.catch(mapped ? mapped() : exception, host);
  }
}
