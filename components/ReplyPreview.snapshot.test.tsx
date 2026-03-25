import React from 'react';
import { render } from '@testing-library/react-native';
import { ReplyPreview } from './ReplyPreview';
import { ChatMessage } from '../types';

const msg: ChatMessage = {
  id: '1',
  role: 'assistant',
  content: 'Here is a reply preview',
  timestamp: 1700000000000,
};

it('ReplyPreview matches snapshot', () => {
  const tree = render(
    <ReplyPreview message={msg} onDismiss={jest.fn()} />,
  );
  expect(tree.toJSON()).toMatchSnapshot();
});
