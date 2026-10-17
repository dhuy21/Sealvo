import { ReminderController } from './reminder.controller.js';
import type { MaintenanceService } from '../maintenance/maintenance.service.js';
import type { ReminderService } from './reminder.service.js';

describe('ReminderController', () => {
  it('still cleans up expired rows when the reminders fail', async () => {
    const error = new Error('db down');
    const reminders = { sendReminders: vi.fn().mockRejectedValue(error) };
    const maintenance = { cleanupExpired: vi.fn().mockResolvedValue(undefined) };
    const controller = new ReminderController(
      reminders as unknown as ReminderService,
      maintenance as unknown as MaintenanceService,
    );

    await expect(controller.triggerReminder()).rejects.toBe(error);
    expect(maintenance.cleanupExpired).toHaveBeenCalledOnce();
  });
});
