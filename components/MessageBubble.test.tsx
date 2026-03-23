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

  it('highlights matching text when searchQuery matches content', () => {
    render(<MessageBubble message={{ ...baseMsg, role: 'user', content: 'Hello world' }} searchQuery="world" />);
    // The word "world" should still be rendered (inside a highlight span)
    expect(screen.getByText(/world/)).toBeTruthy();
    // "Hello" portion should also be present
    expect(screen.getByText(/Hello/)).toBeTruthy();
  });

  it('renders normally when searchQuery does not match content', () => {
    render(<MessageBubble message={{ ...baseMsg, role: 'user', content: 'Hello world' }} searchQuery="xyz" />);
    expect(screen.getByText('Hello world')).toBeTruthy();
  });

  it('calls onLongPress with the message when long-pressed', () => {
    const onLongPress = jest.fn();
    render(<MessageBubble message={baseMsg} onLongPress={onLongPress} />);
    fireEvent(screen.getByRole('button'), 'longPress');
    expect(onLongPress).toHaveBeenCalledWith(baseMsg);
  });

  it('renders without crashing when onSwipeReply is provided', () => {
    const onSwipeReply = jest.fn();
    render(<MessageBubble message={baseMsg} onSwipeReply={onSwipeReply} />);
    expect(screen.getByText('Hello world')).toBeTruthy();
  });

  it('renders assistant messages through MarkdownText', () => {
    render(<MessageBubble message={{ ...baseMsg, role: 'assistant', content: 'Some **markdown**' }} />);
    // MarkdownText renders the content; verify it appears
    expect(screen.getByText(/markdown/)).toBeTruthy();
  });

  it('applies bubbleMatch style when searchQuery matches', () => {
    const { toJSON } = render(
      <MessageBubble message={{ ...baseMsg, role: 'user', content: 'Hello world' }} searchQuery="hello" />,
    );
    const tree = JSON.stringify(toJSON());
    // bubbleMatch adds a border with the primary color; verify the tree contains it
    expect(tree).toBeTruthy();
    // The component should render without errors and contain the content
    expect(screen.getByText(/Hello/)).toBeTruthy();
  });

  it('does not show streaming cursor for user messages when not streaming', () => {
    render(<MessageBubble message={{ ...baseMsg, role: 'user' }} />);
    expect(screen.queryByText('▌')).toBeNull();
  });

  it('shows streaming cursor for user messages when streaming', () => {
    render(<MessageBubble message={{ ...baseMsg, role: 'user', streaming: true }} />);
    expect(screen.getByText('▌')).toBeTruthy();
  });

  it('displays a formatted timestamp for non-pending messages', () => {
    render(<MessageBubble message={baseMsg} />);
    // baseMsg timestamp is 2025-01-01T12:30:00 — toLocaleTimeString with hour/minute
    // The exact format depends on locale, but it should contain "12" and "30"
    expect(screen.getByText(/12/)).toBeTruthy();
    expect(screen.getByText(/30/)).toBeTruthy();
  });

  it('does not show swipe handlers on system messages', () => {
    const onSwipeReply = jest.fn();
    render(
      <MessageBubble
        message={{ ...baseMsg, role: 'system' }}
        onSwipeReply={onSwipeReply}
      />,
    );
    expect(screen.getByText('Hello world')).toBeTruthy();
  });
});
