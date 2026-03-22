import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ConversationDrawer } from './ConversationDrawer';
import { Conversation } from '../types';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockConversations: Conversation[] = [
  { id: 'c1', title: 'First Chat', createdAt: 1000, updatedAt: 3000 },
  { id: 'c2', title: 'Second Chat', createdAt: 2000, updatedAt: 2000 },
];

describe('ConversationDrawer', () => {
  const defaultProps = {
    visible: true,
    conversations: mockConversations,
    activeId: 'c1',
    onSelect: jest.fn(),
    onNew: jest.fn(),
    onDelete: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders conversation list', () => {
    render(<ConversationDrawer {...defaultProps} />);
    expect(screen.getByText('First Chat')).toBeTruthy();
    expect(screen.getByText('Second Chat')).toBeTruthy();
  });

  it('renders header and new button', () => {
    render(<ConversationDrawer {...defaultProps} />);
    expect(screen.getByText('Conversations')).toBeTruthy();
    expect(screen.getByText('+ New Chat')).toBeTruthy();
  });

  it('calls onNew when new chat button is pressed', () => {
    render(<ConversationDrawer {...defaultProps} />);
    fireEvent.press(screen.getByText('+ New Chat'));
    expect(defaultProps.onNew).toHaveBeenCalled();
  });

  it('calls onSelect when a conversation is tapped', () => {
    render(<ConversationDrawer {...defaultProps} />);
    fireEvent.press(screen.getByLabelText('Switch to Second Chat'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith('c2');
  });

  it('calls onDelete when delete button is pressed', () => {
    render(<ConversationDrawer {...defaultProps} />);
    const deleteButtons = screen.getAllByLabelText(/^Delete /);
    fireEvent.press(deleteButtons[0]);
    expect(defaultProps.onDelete).toHaveBeenCalled();
  });

  it('calls onClose when Done button is pressed', () => {
    render(<ConversationDrawer {...defaultProps} />);
    fireEvent.press(screen.getByText('Done'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
