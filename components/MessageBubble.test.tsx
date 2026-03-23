import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
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

  it('shows "Tap to retry" on system messages with retryText', () => {
    const msg: ChatMessage = { ...baseMsg, role: 'system', retryText: 'hello' };
    const onRetry = jest.fn();
    render(<MessageBubble message={msg} onRetry={onRetry} />);
    expect(screen.getByText('Tap to retry')).toBeTruthy();
  });

  it('calls onRetry with message id when tapped', () => {
    const msg: ChatMessage = { ...baseMsg, role: 'system', retryText: 'hello' };
    const onRetry = jest.fn();
    render(<MessageBubble message={msg} onRetry={onRetry} />);
    fireEvent.press(screen.getByRole('button'));
    expect(onRetry).toHaveBeenCalledWith('test-1');
  });

  it('does not show retry hint without retryText', () => {
    render(<MessageBubble message={{ ...baseMsg, role: 'system' }} />);
    expect(screen.queryByText('Tap to retry')).toBeNull();
  });

  it('shows "Queued" indicator for pending messages', () => {
    render(<MessageBubble message={{ ...baseMsg, role: 'user', pending: true }} />);
    expect(screen.getByText(/Queued/)).toBeTruthy();
  });

  it('does not show "Queued" for non-pending messages', () => {
    render(<MessageBubble message={{ ...baseMsg, role: 'user' }} />);
    expect(screen.queryByText(/Queued/)).toBeNull();
  });
});
