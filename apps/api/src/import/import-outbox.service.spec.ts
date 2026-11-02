import { ImportOutboxService } from './import-outbox.service.js';

describe('ImportOutboxService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('leaves a fresh row for the request that is still publishing it', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-18T12:00:00.000Z'));
    const findMany = vi.fn().mockResolvedValue([]);
    const service = new ImportOutboxService({ import_outbox: { findMany } } as never);

    await service.pending();

    expect(findMany).toHaveBeenCalledWith({
      where: { created_at: { lt: new Date('2026-10-18T11:59:45.000Z') } },
      orderBy: { created_at: 'asc' },
      take: 20,
    });
  });

  it('does not start a second flush while the first one is still publishing', async () => {
    vi.useFakeTimers();
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const findMany = vi.fn(() => gate.then(() => []));
    const service = new ImportOutboxService({ import_outbox: { findMany } } as never);

    service.startRelay(vi.fn().mockResolvedValue(true));
    service.startRelay(vi.fn().mockResolvedValue(true));
    await vi.advanceTimersByTimeAsync(5_000);

    expect(findMany).toHaveBeenCalledTimes(1);
    release!();
    await gate;
    service.stopRelay();
  });

  it('publishes a row only for the worker that claimed it', async () => {
    const row = outboxRow();
    const publish = vi.fn().mockResolvedValue(true);
    const winner = relay({
      findMany: vi.fn().mockResolvedValue([row]),
      executeRaw: vi.fn().mockResolvedValue(1),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    });
    const loser = relay({
      findMany: vi.fn().mockResolvedValue([row]),
      executeRaw: vi.fn().mockResolvedValue(0),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    });

    await flush(winner.service, publish);
    await flush(loser.service, publish);

    expect(publish).toHaveBeenCalledTimes(1);
    expect(winner.deleteMany).toHaveBeenCalledWith({ where: { job_id: 'job-1' } });
    expect(loser.deleteMany).not.toHaveBeenCalled();
  });

  it('releases only the claim this worker took when the broker does not confirm', async () => {
    const publish = vi.fn().mockResolvedValue(false);
    const { service, updateMany, deleteMany } = relay({
      findMany: vi.fn().mockResolvedValue([outboxRow()]),
      executeRaw: vi.fn().mockResolvedValue(1),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    });

    await flush(service, publish);

    expect(publish).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith({
      where: { job_id: 'job-1', claimed_at: claimedAt },
      data: { claimed_at: null },
    });
    expect(deleteMany).not.toHaveBeenCalled();
  });
});

const claimedAt = new Date('2026-10-18T12:00:00.000Z');

const outboxRow = () => ({
  job_id: 'job-1',
  user_id: 'u1',
  package_id: 7,
  type: 'import' as const,
  file_name: null,
  word_count: 1,
  payload: [{ word: 'a' }],
  created_at: new Date('2026-10-18T11:00:00.000Z'),
  claimed_at: null,
});

const relay = ({
  findMany,
  executeRaw,
  deleteMany,
}: {
  findMany: ReturnType<typeof vi.fn>;
  executeRaw: ReturnType<typeof vi.fn>;
  deleteMany: ReturnType<typeof vi.fn>;
}) => {
  const updateMany = vi.fn().mockResolvedValue({ count: 1 });
  const findUnique = vi.fn().mockResolvedValue({ claimed_at: claimedAt });
  return {
    service: new ImportOutboxService({
      import_outbox: { findMany, deleteMany, updateMany },
      $transaction: (fn: (tx: unknown) => unknown) =>
        fn({ $executeRaw: executeRaw, import_outbox: { findUnique } }),
    } as never),
    executeRaw,
    deleteMany,
    updateMany,
  };
};

type Publish = (payload: unknown) => Promise<boolean>;

const flush = (service: ImportOutboxService, publish: Publish) =>
  (service as unknown as { flush(send: Publish): Promise<void> }).flush(publish);
