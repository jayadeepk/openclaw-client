import { ChatMessage } from '../types';

let _seq = 0;

/** Generate a unique request ID */
export function nextId(): string {
  return `rn_${String(Date.now())}_${String(_seq++)}`;
}

/** Extract plain text from gateway content (string, {type,text}, or array of content blocks) */
export function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(extractText).join('');
  if (content && typeof content === 'object' && 'text' in content) return String((content as { text: unknown }).text);
  return '';
}

export function makeUserMsg(content: string): ChatMessage {
  return { id: nextId(), role: 'user', content, timestamp: Date.now() };
}

export function makeSystemMsg(content: string): ChatMessage {
  return { id: nextId(), role: 'system', content, timestamp: Date.now() };
}

/** Date separator item mixed into the chat list */
export interface DateSeparatorItem {
  type: 'date-separator';
  id: string;
  label: string;
}

export type ChatListItem = ChatMessage | DateSeparatorItem;

/** Format a date as a human-friendly day label */
export function formatDayLabel(timestamp: number, now?: number): string {
  const date = new Date(timestamp);
  const today = new Date(now ?? Date.now());

  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffMs = todayDay.getTime() - dateDay.getTime();
  const diffDays = Math.round(diffMs / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Format a timestamp as a short time string */
function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** Format messages as a plain-text conversation export */
export function formatConversationExport(messages: ChatMessage[], title?: string): string {
  const lines: string[] = [];
  if (title) {
    lines.push(title);
    lines.push('='.repeat(title.length));
    lines.push('');
  }

  for (const msg of messages) {
    if (msg.role === 'system') continue;
    const label = msg.role === 'user' ? 'You' : 'OpenClaw';
    const time = formatTime(msg.timestamp);
    lines.push(`[${time}] ${label}:`);
    lines.push(msg.content);
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

/** Insert date separator items between messages from different days */
export function insertDateSeparators(messages: ChatMessage[], now?: number): ChatListItem[] {
  const result: ChatListItem[] = [];
  let lastDateKey = '';

  for (const msg of messages) {
    const date = new Date(msg.timestamp);
    const dateKey = `${String(date.getFullYear())}-${String(date.getMonth())}-${String(date.getDate())}`;

    if (dateKey !== lastDateKey) {
      result.push({
        type: 'date-separator',
        id: `sep-${dateKey}`,
        label: formatDayLabel(msg.timestamp, now),
      });
      lastDateKey = dateKey;
    }
    result.push(msg);
  }

  return result;
}
