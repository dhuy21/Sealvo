import { randomBytes } from 'crypto';
import { ConflictException, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service.js';

const USER_ID_MAX_ATTEMPTS = 5;

export async function createUser(prisma: PrismaService, data: Omit<Prisma.usersCreateInput, 'id'>) {
  // Random 7-char IDs can collide: retry on a primary-key conflict (fix #48)
  for (let attempt = 0; attempt < USER_ID_MAX_ATTEMPTS; attempt++) {
    try {
      return await prisma.users.create({
        data: { id: randomBytes(4).toString('hex').substring(0, 7), ...data },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        if (error.meta?.target === 'PRIMARY') continue;
        throw new ConflictException("Ce nom d'utilisateur ou cette adresse email est déjà utilisé");
      }
      // PrismaExceptionFilter maps it: a CHECK violation (email format) becomes a 400, the rest a 500
      throw error;
    }
  }
  throw new InternalServerErrorException('Une erreur est survenue. Veuillez réessayer plus tard.');
}
