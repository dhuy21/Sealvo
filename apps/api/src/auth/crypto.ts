import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';

export const BCRYPT_ROUNDS = 12;

/** 256 random bits, hex: session secrets and the tokens of emailed links */
export const newToken = () => randomBytes(32).toString('hex');

/** Stored instead of the token: a database leak gives no usable session or link */
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_ROUNDS);
