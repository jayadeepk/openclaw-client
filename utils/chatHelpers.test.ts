import { nextId, extractText, makeUserMsg, makeSystemMsg, formatDayLabel, insertDateSeparators, DateSeparatorItem } from './chatHelpers';
import { ChatMessage } from '../types';

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

describe('formatDayLabel', () => {
  const now = new Date(2026, 2, 22, 12, 0, 0).getTime(); // Mar 22, 2026

  it('returns "Today" for same day', () => {
    expect(formatDayLabel(now, now)).toBe('Today');
  });

  it('returns "Yesterday" for previous day', () => {
    const yesterday = now - 86400000;
    expect(formatDayLabel(yesterday, now)).toBe('Yesterday');
  });

  it('returns formatted date for older messages', () => {
    const threeDaysAgo = now - 3 * 86400000;
    const label = formatDayLabel(threeDaysAgo, now);
    // Should contain "Mar" and "19"
    expect(label).toContain('Mar');
    expect(label).toContain('19');
  });
});

describe('insertDateSeparators', () => {
  const now = new Date(2026, 2, 22, 12, 0, 0).getTime();
  const yesterday = now - 86400000;

  const makeMsg = (id: string, timestamp: number): ChatMessage => ({
    id,
    role: 'user',
    content: `msg-${id}`,
    timestamp,
  });

  it('returns empty array for empty messages', () => {
    expect(insertDateSeparators([], now)).toEqual([]);
  });

  it('adds a separator before the first message', () => {
    const msgs = [makeMsg('1', now)];
    const result = insertDateSeparators(msgs, now);
    expect(result).toHaveLength(2);
    expect((result[0] as DateSeparatorItem).type).toBe('date-separator');
    expect((result[0] as DateSeparatorItem).label).toBe('Today');
  });

  it('groups same-day messages under one separator', () => {
    const msgs = [
      makeMsg('1', now),
      makeMsg('2', now + 1000),
    ];
    const result = insertDateSeparators(msgs, now);
    expect(result).toHaveLength(3); // 1 separator + 2 messages
  });

  it('inserts separator between different days', () => {
    const msgs = [
      makeMsg('1', yesterday),
      makeMsg('2', now),
    ];
    const result = insertDateSeparators(msgs, now);
    expect(result).toHaveLength(4); // 2 separators + 2 messages
    expect((result[0] as DateSeparatorItem).label).toBe('Yesterday');
    expect((result[2] as DateSeparatorItem).label).toBe('Today');
  });
});
