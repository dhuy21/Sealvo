import { activityPercent } from './activity-percent.js';

describe('activityPercent', () => {
  it('keeps a finished or failed row from showing a bar', () => {
    expect(activityPercent('succeeded', 'done', 10, 10)).toBeNull();
    expect(activityPercent('failed', 'gemini', 4, 10)).toBeNull();
  });

  it('fills the first half during analysis and the second while saving', () => {
    expect(activityPercent('running', 'parsing', 0, 10)).toBe(0);
    expect(activityPercent('running', 'gemini', 0, 10)).toBe(0);
    expect(activityPercent('running', 'gemini', 5, 10)).toBe(25);
    expect(activityPercent('running', 'gemini', 10, 10)).toBe(50);
    expect(activityPercent('running', 'saving', 0, 10)).toBe(50);
    expect(activityPercent('running', 'saving', 5, 10)).toBe(75);
    expect(activityPercent('running', 'saving', 10, 10)).toBe(100);
  });
});
