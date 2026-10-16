import { createHash } from 'crypto';
import { SessionService } from './session.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

interface SessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  previous_hash: string | null;
  rotated_at: Date | null;
  expires_at: Date;
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const secretOf = (token: string) => token.split('.')[1];

/** In-memory refresh_sessions table: updateMany honours the token_hash condition (compare-and-swap) */
function fakePrisma() {
  const rows = new Map<string, SessionRow>();
  const refresh_sessions = {
    create: vi.fn(({ data }: { data: Omit<SessionRow, 'previous_hash' | 'rotated_at'> }) => {
      const row = { ...data, previous_hash: null, rotated_at: null };
      rows.set(row.id, row);
      return Promise.resolve(row);
    }),
    findUnique: vi.fn(({ where }: { where: { id: string } }) =>
      Promise.resolve(rows.has(where.id) ? { ...rows.get(where.id)! } : null),
    ),
    updateMany: vi.fn(({ where, data }: { where: Partial<SessionRow>; data: Partial<SessionRow> }) => {
      const row = rows.get(where.id!);
      if (!row || row.token_hash !== where.token_hash) return Promise.resolve({ count: 0 });
      Object.assign(row, data);
      return Promise.resolve({ count: 1 });
    }),
    deleteMany: vi.fn(({ where }: { where: { id: string } }) => {
      rows.delete(where.id);
      return Promise.resolve({ count: 1 });
    }),
  };
  return { rows, prisma: { refresh_sessions } as unknown as PrismaService };
}

describe('SessionService', () => {
  let service: SessionService;
  let rows: Map<string, SessionRow>;

  beforeEach(() => {
    const fake = fakePrisma();
    rows = fake.rows;
    service = new SessionService(fake.prisma);
  });

  afterEach(() => vi.useRealTimers());

  it('stores only the hash of the secret', async () => {
    const token = await service.create('u1');
    const [row] = [...rows.values()];
    expect(row.token_hash).toBe(sha256(secretOf(token)));
    expect(JSON.stringify(row)).not.toContain(secretOf(token));
  });

  it('rotates: the new token works and the session keeps its owner', async () => {
    const token = await service.create('u1');
    const rotated = await service.rotate(token);
    expect(rotated?.userId).toBe('u1');
    await expect(service.rotate(rotated!.token)).resolves.toMatchObject({ userId: 'u1' });
  });

  it('accepts the just-rotated token during the leeway (concurrent tabs)', async () => {
    const token = await service.create('u1');
    await service.rotate(token);
    await expect(service.rotate(token)).resolves.toMatchObject({ userId: 'u1' });
    expect(rows.size).toBe(1);
  });

  it('revokes the session when a rotated token is replayed after the leeway', async () => {
    vi.useFakeTimers();
    const token = await service.create('u1');
    const rotated = await service.rotate(token);
    vi.advanceTimersByTime(31_000);

    await expect(service.rotate(token)).resolves.toBeNull();
    expect(rows.size).toBe(0);
    await expect(service.rotate(rotated!.token)).resolves.toBeNull();
  });

  it('revokes the session when an older generation is replayed', async () => {
    const t0 = await service.create('u1');
    const t1 = (await service.rotate(t0))!.token;
    await service.rotate(t1);

    await expect(service.rotate(t0)).resolves.toBeNull();
    expect(rows.size).toBe(0);
  });

  it('rejects expired sessions and malformed tokens without touching the table', async () => {
    const token = await service.create('u1');
    [...rows.values()][0].expires_at = new Date(Date.now() - 1);
    await expect(service.rotate(token)).resolves.toBeNull();
    await expect(service.rotate('not-a-token')).resolves.toBeNull();
    await expect(service.rotate(undefined)).resolves.toBeNull();
  });

  it('logout revokes only that device', async () => {
    const laptop = await service.create('u1');
    const phone = await service.create('u1');
    await service.revoke(laptop);
    await expect(service.rotate(laptop)).resolves.toBeNull();
    await expect(service.rotate(phone)).resolves.toMatchObject({ userId: 'u1' });
  });
});
