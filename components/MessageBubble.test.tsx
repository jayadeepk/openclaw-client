import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { MessageBubble } from './MessageBubble';
import { ChatMessage } from '../types';

const baseMsg: ChatMessage = {
  id: 'test-1',
  role: 'assistant',
  content: 'Hello world',
  timestamp: new Date('2025-01-01T12:30:00').getTime(),
};

describe('MessageBubble', () => {
  it('renders message content', () => {
    render(<MessageBubble message={baseMsg} />);
    expect(screen.getByText('Hello world')).toBeTruthy();
  });

  it('shows "OpenClaw" label for assistant messages', () => {
    render(<MessageBubble message={baseMsg} />);
    expect(screen.getByText('OpenClaw')).toBeTruthy();
  });

  it('shows "System" label for system messages', () => {
    render(<MessageBubble message={{ ...baseMsg, role: 'system' }} />);
    expect(screen.getByText('System')).toBeTruthy();
  });

  it('does not show role label for user messages', () => {
    render(<MessageBubble message={{ ...baseMsg, role: 'user' }} />);
    expect(screen.queryByText('OpenClaw')).toBeNull();
    expect(screen.queryByText('System')).toBeNull();
  });

  it('shows streaming cursor when streaming', () => {
    render(<MessageBubble message={{ ...baseMsg, streaming: true }} />);
    expect(screen.getByText('▌')).toBeTruthy();
  });

  it('hides streaming cursor when not streaming', () => {
    render(<MessageBubble message={baseMsg} />);
    expect(screen.queryByText('▌')).toBeNull();
  });
});
