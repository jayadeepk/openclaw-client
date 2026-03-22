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
