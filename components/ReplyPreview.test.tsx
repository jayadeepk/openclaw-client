import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ReplyPreview } from './ReplyPreview';
import { ChatMessage } from '../types';

const userMsg: ChatMessage = {
  id: '1',
  role: 'user',
  content: 'Hello there',
  timestamp: Date.now(),
};

const assistantMsg: ChatMessage = {
  id: '2',
  role: 'assistant',
  content: 'Hi! How can I help?',
  timestamp: Date.now(),
};

describe('ReplyPreview', () => {
  it('shows "You" label for user messages', () => {
    render(<ReplyPreview message={userMsg} onDismiss={jest.fn()} />);
    expect(screen.getByText('You')).toBeTruthy();
  });

  it('shows "OpenClaw" label for assistant messages', () => {
    render(<ReplyPreview message={assistantMsg} onDismiss={jest.fn()} />);
    expect(screen.getByText('OpenClaw')).toBeTruthy();
  });

  it('shows message content preview', () => {
    render(<ReplyPreview message={userMsg} onDismiss={jest.fn()} />);
    expect(screen.getByText('Hello there')).toBeTruthy();
  });

  it('truncates long messages', () => {
    const longMsg: ChatMessage = {
      ...userMsg,
      content: 'A'.repeat(200),
    };
    render(<ReplyPreview message={longMsg} onDismiss={jest.fn()} />);
    expect(screen.getByText('A'.repeat(120) + '...')).toBeTruthy();
  });

  it('calls onDismiss when dismiss button is pressed', () => {
    const onDismiss = jest.fn();
    render(<ReplyPreview message={userMsg} onDismiss={onDismiss} />);
    fireEvent.press(screen.getByLabelText('Cancel reply'));
    expect(onDismiss).toHaveBeenCalled();
  });
});
