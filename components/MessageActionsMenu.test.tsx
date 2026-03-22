import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { MessageActionsMenu } from './MessageActionsMenu';
import { ChatMessage } from '../types';

const baseMsg: ChatMessage = {
  id: 'msg-1',
  role: 'assistant',
  content: 'Hello world',
  timestamp: Date.now(),
};

describe('MessageActionsMenu', () => {
  it('renders nothing when message is null', () => {
    const { toJSON } = render(
      <MessageActionsMenu message={null} visible={false} onClose={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('shows Copy, Share, Delete, and Cancel actions for assistant message', () => {
    render(
      <MessageActionsMenu
        message={baseMsg}
        visible={true}
        onClose={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText('Copy')).toBeTruthy();
    expect(screen.getByText('Share')).toBeTruthy();
    expect(screen.getByText('Delete')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('does not show Retry for assistant messages', () => {
    render(
      <MessageActionsMenu
        message={baseMsg}
        visible={true}
        onClose={jest.fn()}
        onRetry={jest.fn()}
      />,
    );
    expect(screen.queryByText('Retry')).toBeNull();
  });

  it('shows Retry for user messages', () => {
    const userMsg: ChatMessage = { ...baseMsg, role: 'user' };
    render(
      <MessageActionsMenu
        message={userMsg}
        visible={true}
        onClose={jest.fn()}
        onRetry={jest.fn()}
      />,
    );
    expect(screen.getByText('Retry')).toBeTruthy();
  });

  it('shows Retry for system messages with retryText', () => {
    const sysMsg: ChatMessage = { ...baseMsg, role: 'system', retryText: 'hello' };
    render(
      <MessageActionsMenu
        message={sysMsg}
        visible={true}
        onClose={jest.fn()}
        onRetry={jest.fn()}
      />,
    );
    expect(screen.getByText('Retry')).toBeTruthy();
  });

  it('copies message content and closes on Copy press', () => {
    const onClose = jest.fn();
    render(
      <MessageActionsMenu message={baseMsg} visible={true} onClose={onClose} />,
    );
    fireEvent.press(screen.getByText('Copy'));
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('Hello world');
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onRetry and closes on Retry press', () => {
    const onRetry = jest.fn();
    const onClose = jest.fn();
    const userMsg: ChatMessage = { ...baseMsg, role: 'user' };
    render(
      <MessageActionsMenu
        message={userMsg}
        visible={true}
        onClose={onClose}
        onRetry={onRetry}
      />,
    );
    fireEvent.press(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledWith('msg-1');
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onDelete and closes on Delete press', () => {
    const onDelete = jest.fn();
    const onClose = jest.fn();
    render(
      <MessageActionsMenu
        message={baseMsg}
        visible={true}
        onClose={onClose}
        onDelete={onDelete}
      />,
    );
    fireEvent.press(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith('msg-1');
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Cancel press', () => {
    const onClose = jest.fn();
    render(
      <MessageActionsMenu message={baseMsg} visible={true} onClose={onClose} />,
    );
    fireEvent.press(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows message preview', () => {
    render(
      <MessageActionsMenu message={baseMsg} visible={true} onClose={jest.fn()} />,
    );
    expect(screen.getByText('Hello world')).toBeTruthy();
  });
});
