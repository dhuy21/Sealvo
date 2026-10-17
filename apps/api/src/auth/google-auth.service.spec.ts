import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { authConfig } from '../config/auth.config.js';
import { testAuthConfig } from '../config/testing.js';
import * as bcrypt from 'bcryptjs';
import { GoogleAuthService } from './google-auth.service.js';
import { TokenService } from './token.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SessionService } from './session.service.js';

describe('GoogleAuthService', () => {
  let service: GoogleAuthService;
  let prisma: {
    users: { findUnique: any; findMany: any; create: any; update: any };
    email_verification: { updateMany: any };
    refresh_sessions: { deleteMany: any };
    $transaction: any;
  };

  let sessions: { create: any };

  beforeEach(async () => {
    sessions = { create: vi.fn().mockResolvedValue('session.token') };
    prisma = {
      users: {
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
      },
      email_verification: { updateMany: vi.fn() },
      refresh_sessions: { deleteMany: vi.fn() },
      $transaction: vi.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        GoogleAuthService,
        TokenService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: vi.fn().mockReturnValue('token') } },
        { provide: authConfig.KEY, useValue: testAuthConfig() },
        { provide: SessionService, useValue: sessions },
      ],
    }).compile();

    service = module.get(GoogleAuthService);
  });

  describe('googleLogin', () => {
    const mockGoogle = (profile: object) => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'google-token' })))
          .mockResolvedValueOnce(new Response(JSON.stringify(profile))),
      );
    };

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should create a verified user with a hashed random password on first login', async () => {
      mockGoogle({ email: 'new@gmail.com', name: 'New User', verified_email: true });
      prisma.users.findUnique.mockResolvedValue(null);
      prisma.users.create.mockResolvedValue({ id: 'abc1234', username: 'NewUser', role: 'User' });

      const result = await service.googleLogin('code');

      expect(prisma.users.create).toHaveBeenCalledWith({
        data: {
          id: expect.any(String),
          email: 'new@gmail.com',
          username: 'NewUser',
          password: expect.stringMatching(/^\$2[aby]\$12\$/),
          is_verified: true,
        },
      });
      expect(result).toHaveProperty('refreshToken');
    });

    it('should add a random suffix when the username is taken', async () => {
      mockGoogle({ email: 'new@gmail.com', name: 'New User', verified_email: true });
      prisma.users.findUnique.mockImplementation(({ where }: { where: { username?: string } }) =>
        Promise.resolve(where.username === 'NewUser' ? { id: 'other12' } : null),
      );
      prisma.users.create.mockResolvedValue({ id: 'abc1234', username: 'x', role: 'User' });

      await service.googleLogin('code');

      expect(prisma.users.create.mock.calls[0][0].data.username).toMatch(/^NewUser_[0-9a-f]{6}$/);
    });

    it('should fall back to the email local part when the name is empty', async () => {
      mockGoogle({ email: 'jane.doe@gmail.com', name: '', verified_email: true });
      prisma.users.findUnique.mockResolvedValue(null);
      prisma.users.create.mockResolvedValue({ id: 'abc1234', username: 'x', role: 'User' });

      await service.googleLogin('code');

      expect(prisma.users.create.mock.calls[0][0].data.username).toBe('jane.doe');
    });

    it('should log in an existing user without creating one', async () => {
      mockGoogle({ email: 'old@gmail.com', name: 'Old User', verified_email: true });
      prisma.users.findMany.mockResolvedValue([
        { id: 'old1234', username: 'old', email: 'old@gmail.com', role: 'User', is_verified: true },
      ]);

      const result = await service.googleLogin('code');

      expect(prisma.users.create).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.users.update).not.toHaveBeenCalled();
      expect(result).toHaveProperty('refreshToken');
    });

    it('should verify an unverified account and drop its password, sessions and pending tokens', async () => {
      mockGoogle({ email: 'victim@gmail.com', name: 'Victim', verified_email: true });
      const attackerHash = await bcrypt.hash('attacker-pass', 4);
      prisma.users.findMany.mockResolvedValue([
        {
          id: 'vic1234',
          username: 'victim',
          email: 'victim@gmail.com',
          role: 'User',
          is_verified: false,
          password: attackerHash,
        },
      ]);

      const result = await service.googleLogin('code');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const { data } = prisma.users.update.mock.calls[0][0];
      expect(data).toEqual({
        is_verified: true,
        password: expect.stringMatching(/^\$2[aby]\$12\$/),
      });
      expect(await bcrypt.compare('attacker-pass', data.password)).toBe(false);
      expect(prisma.refresh_sessions.deleteMany).toHaveBeenCalledWith({
        where: { user_id: 'vic1234' },
      });
      expect(prisma.email_verification.updateMany).toHaveBeenCalledWith({
        where: { user_id: 'vic1234', status: 'pending' },
        data: { status: 'revoked' },
      });
      expect(result).toHaveProperty('refreshToken');
    });

    it('should look up both email forms and create the user with the normalized email', async () => {
      mockGoogle({ email: 'Jane.Doe@GoogleMail.com', name: 'Jane', verified_email: true });
      prisma.users.findUnique.mockResolvedValue(null);
      prisma.users.create.mockResolvedValue({ id: 'abc1234', username: 'Jane', role: 'User' });

      await service.googleLogin('code');

      expect(prisma.users.findMany).toHaveBeenCalledWith({
        where: { email: { in: ['janedoe@gmail.com', 'Jane.Doe@GoogleMail.com'] } },
      });
      expect(prisma.users.create.mock.calls[0][0].data.email).toBe('janedoe@gmail.com');
    });

    it('should log in the account registered with the normalized email', async () => {
      mockGoogle({ email: 'jane.doe@gmail.com', name: 'Jane', verified_email: true });
      prisma.users.findMany.mockResolvedValue([
        { id: 'raw1234', email: 'jane.doe@gmail.com', role: 'User', is_verified: true },
        { id: 'nor1234', email: 'janedoe@gmail.com', role: 'User', is_verified: true },
      ]);

      await service.googleLogin('code');

      expect(prisma.users.create).not.toHaveBeenCalled();
      expect(sessions.create).toHaveBeenCalledWith('nor1234');
    });

    it('should still log in an account stored with the raw Google email', async () => {
      mockGoogle({ email: 'jane.doe@gmail.com', name: 'Jane', verified_email: true });
      prisma.users.findMany.mockResolvedValue([
        { id: 'raw1234', email: 'jane.doe@gmail.com', role: 'User', is_verified: true },
      ]);

      await service.googleLogin('code');

      expect(prisma.users.create).not.toHaveBeenCalled();
      expect(sessions.create).toHaveBeenCalledWith('raw1234');
    });

    it('should reject a Google account whose email is not verified', async () => {
      mockGoogle({ email: 'old@gmail.com', name: 'Old User', verified_email: false });

      await expect(service.googleLogin('code')).rejects.toThrow(UnauthorizedException);
      expect(prisma.users.findMany).not.toHaveBeenCalled();
    });
  });
});
