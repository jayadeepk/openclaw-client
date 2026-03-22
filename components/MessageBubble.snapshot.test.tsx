import React from 'react';
import { render } from '@testing-library/react-native';
import { MessageBubble } from './MessageBubble';
import { ChatMessage } from '../types';

const ts = new Date('2025-06-15T14:30:00Z').getTime();

const messages: Record<string, ChatMessage> = {
  user: { id: 'u1', role: 'user', content: 'Hello there!', timestamp: ts },
  assistant: { id: 'a1', role: 'assistant', content: 'Hi! How can I help?', timestamp: ts },
  system: { id: 's1', role: 'system', content: 'Connection lost', timestamp: ts },
  streaming: { id: 'a2', role: 'assistant', content: 'Thinking...', timestamp: ts, streaming: true },
};

describe('MessageBubble snapshots', () => {
  it.each(Object.entries(messages))('%s message', (_name, msg) => {
    const { toJSON } = render(<MessageBubble message={msg} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
