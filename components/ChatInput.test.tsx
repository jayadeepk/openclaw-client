import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ChatInput } from './ChatInput';

describe('ChatInput', () => {
  it('renders input and send button', () => {
    render(<ChatInput onSend={jest.fn()} />);
    expect(screen.getByPlaceholderText('Message OpenClaw...')).toBeTruthy();
    expect(screen.getByText('↑')).toBeTruthy();
  });

  it('calls onSend with trimmed text on press', () => {
    const onSend = jest.fn();
    render(<ChatInput onSend={onSend} />);
    const input = screen.getByPlaceholderText('Message OpenClaw...');
    fireEvent.changeText(input, '  hello  ');
    fireEvent.press(screen.getByText('↑'));
    expect(onSend).toHaveBeenCalledWith('hello');
  });

  it('clears input after send', () => {
    render(<ChatInput onSend={jest.fn()} />);
    const input = screen.getByPlaceholderText('Message OpenClaw...');
    fireEvent.changeText(input, 'hello');
    fireEvent.press(screen.getByText('↑'));
    expect(input.props.value).toBe('');
  });

  it('does not call onSend with whitespace-only input', () => {
    const onSend = jest.fn();
    render(<ChatInput onSend={onSend} />);
    const input = screen.getByPlaceholderText('Message OpenClaw...');
    fireEvent.changeText(input, '   ');
    fireEvent.press(screen.getByText('↑'));
    expect(onSend).not.toHaveBeenCalled();
  });

  it('does not call onSend when disabled', () => {
    const onSend = jest.fn();
    render(<ChatInput onSend={onSend} disabled />);
    const input = screen.getByPlaceholderText('Message OpenClaw...');
    fireEvent.changeText(input, 'hello');
    fireEvent.press(screen.getByText('↑'));
    expect(onSend).not.toHaveBeenCalled();
  });

  it('input is not editable when disabled', () => {
    render(<ChatInput onSend={jest.fn()} disabled />);
    const input = screen.getByPlaceholderText('Message OpenClaw...');
    expect(input.props.editable).toBe(false);
  });
});
