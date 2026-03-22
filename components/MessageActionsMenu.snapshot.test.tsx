import React from 'react';
import { render } from '@testing-library/react-native';
import { MessageActionsMenu } from './MessageActionsMenu';
import { ChatMessage } from '../types';

const msg: ChatMessage = {
  id: 'msg-1',
  role: 'assistant',
  content: 'Hello world',
  timestamp: Date.now(),
};

describe('MessageActionsMenu snapshots', () => {
  it('visible with assistant message', () => {
    const { toJSON } = render(
      <MessageActionsMenu
        message={msg}
        visible={true}
        onClose={jest.fn()}
        onRetry={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('visible with user message (shows retry)', () => {
    const userMsg: ChatMessage = { ...msg, role: 'user' };
    const { toJSON } = render(
      <MessageActionsMenu
        message={userMsg}
        visible={true}
        onClose={jest.fn()}
        onRetry={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
