import { MaintenanceService } from './maintenance.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('MaintenanceService', () => {
  const tables = [
    'email_verification',
    'users',
    'refresh_sessions',
    'password_reset_tokens',
    'applied_jobs',
  ] as const;
  let prisma: Record<(typeof tables)[number], { deleteMany: ReturnType<typeof vi.fn> }>;
  let service: MaintenanceService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 15, 30));
    prisma = Object.fromEntries(
      tables.map((t) => [t, { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) }]),
    ) as typeof prisma;
    service = new MaintenanceService(prisma as unknown as PrismaService);
  });

  afterEach(() => vi.useRealTimers());

  it('deletes with the old SQL day cutoffs', async () => {
    await service.cleanupExpired();

    expect(prisma.email_verification.deleteMany).toHaveBeenCalledWith({
      where: { created_at: { lt: new Date(2026, 9, 3) } },
    });
    expect(prisma.users.deleteMany).toHaveBeenCalledWith({
      where: { is_verified: false, created_at: { lt: new Date(2026, 9, 15) } },
    });
    expect(prisma.applied_jobs.deleteMany).toHaveBeenCalledWith({
      where: { created_at: { lt: new Date(2026, 9, 11) } },
    });
    expect(prisma.refresh_sessions.deleteMany).toHaveBeenCalledWith({
      where: { expires_at: { lt: new Date(2026, 9, 17, 15, 30) } },
    });
  });

  it('keeps cleaning the other tables when one delete fails', async () => {
    prisma.email_verification.deleteMany.mockRejectedValue(new Error('lock wait timeout'));

    await expect(service.cleanupExpired()).resolves.toBeUndefined();

    for (const t of tables) expect(prisma[t].deleteMany).toHaveBeenCalledTimes(1);
  });
});
