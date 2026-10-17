import { describe, expect, it } from 'vitest';
import { BOLD_MARKUP, stripBoldMarkup } from './bold-markup';

describe('stripBoldMarkup', () => {
  it('removes the markers around every marked word', () => {
    expect(stripBoldMarkup('I **ate** an **apple**')).toBe('I ate an apple');
  });

  it('leaves text without markers or with unmatched markers unchanged', () => {
    expect(stripBoldMarkup('plain text')).toBe('plain text');
    expect(stripBoldMarkup('a ** b')).toBe('a ** b');
    expect(stripBoldMarkup('')).toBe('');
  });

  it('gives the same result on repeated calls (global regex state is not kept)', () => {
    expect(stripBoldMarkup('**a** b')).toBe('a b');
    expect(stripBoldMarkup('**a** b')).toBe('a b');
  });
});

describe('BOLD_MARKUP', () => {
  it('captures each marked word', () => {
    expect([...'**go** and **come**'.matchAll(BOLD_MARKUP)].map((m) => m[1])).toEqual(['go', 'come']);
  });
});
