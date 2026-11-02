import { ActivityLogService } from './activity-log.service.js';

describe('ActivityLogService', () => {
  it('writes one succeeded row and leaves import fields empty', async () => {
    const create = vi.fn();
    const service = new ActivityLogService(undefined as never);

    await service.succeeded({ user_activities: { create } }, { userId: 'abc1234', type: 'login' });

    expect(create).toHaveBeenCalledWith({
      data: {
        id: expect.any(String),
        user_id: 'abc1234',
        type: 'login',
        status: 'succeeded',
        occurred_at: expect.any(Date),
        updated_at: expect.any(Date),
        package_id: undefined,
        package_name: undefined,
      },
    });
  });

  it('keeps the package name on a deletion', async () => {
    const create = vi.fn();
    const service = new ActivityLogService(undefined as never);

    await service.succeeded(
      { user_activities: { create } },
      {
        userId: 'abc1234',
        type: 'package_delete',
        packageId: 9,
        packageName: 'Animals',
      },
    );

    expect(create.mock.calls[0][0].data).toMatchObject({
      type: 'package_delete',
      package_id: 9,
      package_name: 'Animals',
      status: 'succeeded',
    });
  });
});
