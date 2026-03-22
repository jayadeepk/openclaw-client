import React from 'react';
import { render } from '@testing-library/react-native';
import { ConversationDrawer } from './ConversationDrawer';
import { Conversation } from '../types';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const conversations: Conversation[] = [
  { id: 'c1', title: 'First Chat', createdAt: 1000, updatedAt: 3000 },
  { id: 'c2', title: 'Second Chat', createdAt: 2000, updatedAt: 2000 },
];

it('ConversationDrawer matches snapshot', () => {
  const tree = render(
    <ConversationDrawer
      visible={true}
      conversations={conversations}
      activeId="c1"
      onSelect={jest.fn()}
      onNew={jest.fn()}
      onDelete={jest.fn()}
      onClose={jest.fn()}
    />,
  );
  expect(tree.toJSON()).toMatchSnapshot();
});
