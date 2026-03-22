import { nextId, extractText, makeUserMsg, makeSystemMsg } from './chatHelpers';

describe('nextId', () => {
  it('returns a string starting with rn_', () => {
    expect(nextId()).toMatch(/^rn_\d+_\d+$/);
  });

  it('returns unique ids on sequential calls', () => {
    const a = nextId();
    const b = nextId();
    expect(a).not.toBe(b);
  });
});

describe('extractText', () => {
  it('returns string content as-is', () => {
    expect(extractText('hello')).toBe('hello');
  });

  it('extracts text from an object with text field', () => {
    expect(extractText({ type: 'text', text: 'hi' })).toBe('hi');
  });

  it('joins array of strings', () => {
    expect(extractText(['a', 'b', 'c'])).toBe('abc');
  });

  it('joins array of objects with text fields', () => {
    expect(extractText([{ text: 'a' }, { text: 'b' }])).toBe('ab');
  });

  it('handles mixed arrays', () => {
    expect(extractText(['a', { text: 'b' }])).toBe('ab');
  });

  it('returns empty string for null', () => {
    expect(extractText(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(extractText(undefined)).toBe('');
  });

  it('returns empty string for empty array', () => {
    expect(extractText([])).toBe('');
  });

  it('returns empty string for number', () => {
    expect(extractText(42)).toBe('');
  });
});

describe('makeUserMsg', () => {
  it('creates a user message with correct fields', () => {
    const msg = makeUserMsg('hello');
    expect(msg.role).toBe('user');
    expect(msg.content).toBe('hello');
    expect(msg.id).toMatch(/^rn_/);
    expect(typeof msg.timestamp).toBe('number');
  });
});

describe('makeSystemMsg', () => {
  it('creates a system message with correct fields', () => {
    const msg = makeSystemMsg('error occurred');
    expect(msg.role).toBe('system');
    expect(msg.content).toBe('error occurred');
    expect(msg.id).toMatch(/^rn_/);
    expect(typeof msg.timestamp).toBe('number');
  });
});
