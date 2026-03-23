import React from 'react';
import { Platform } from 'react-native';
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

  it('sends on Enter key press on web', () => {
    const original = Platform.OS;
    Platform.OS = 'web';
    const onSend = jest.fn();
    render(<ChatInput onSend={onSend} />);
    const input = screen.getByPlaceholderText('Message OpenClaw...');
    fireEvent.changeText(input, 'hello');
    fireEvent(input, 'keyPress', { nativeEvent: { key: 'Enter' }, preventDefault: jest.fn() });
    expect(onSend).toHaveBeenCalledWith('hello');
    Platform.OS = original;
  });

  it('does not send on Shift+Enter on web', () => {
    const original = Platform.OS;
    Platform.OS = 'web';
    const onSend = jest.fn();
    render(<ChatInput onSend={onSend} />);
    const input = screen.getByPlaceholderText('Message OpenClaw...');
    fireEvent.changeText(input, 'hello');
    fireEvent(input, 'keyPress', { nativeEvent: { key: 'Enter' }, shiftKey: true, preventDefault: jest.fn() });
    expect(onSend).not.toHaveBeenCalled();
    Platform.OS = original;
  });

  it('shows offline placeholder when offline', () => {
    render(<ChatInput onSend={jest.fn()} offline />);
    expect(screen.getByPlaceholderText('Message (will send when online)...')).toBeTruthy();
  });

  it('allows sending when offline (queues message)', () => {
    const onSend = jest.fn();
    render(<ChatInput onSend={onSend} offline />);
    const input = screen.getByPlaceholderText('Message (will send when online)...');
    fireEvent.changeText(input, 'queued hello');
    fireEvent.press(screen.getByText('↑'));
    expect(onSend).toHaveBeenCalledWith('queued hello');
  });

  describe('slash commands', () => {
    it('shows autocomplete suggestions when typing /', () => {
      render(<ChatInput onSend={jest.fn()} onSlashCommand={jest.fn()} />);
      const input = screen.getByPlaceholderText('Message OpenClaw...');
      fireEvent.changeText(input, '/');
      expect(screen.getByText('/clear')).toBeTruthy();
      expect(screen.getByText('/new')).toBeTruthy();
      expect(screen.getByText('/export')).toBeTruthy();
      expect(screen.getByText('/theme')).toBeTruthy();
    });

    it('filters suggestions as user types', () => {
      render(<ChatInput onSend={jest.fn()} onSlashCommand={jest.fn()} />);
      const input = screen.getByPlaceholderText('Message OpenClaw...');
      fireEvent.changeText(input, '/cl');
      expect(screen.getByText('/clear')).toBeTruthy();
      expect(screen.queryByText('/new')).toBeNull();
    });

    it('hides suggestions for non-slash input', () => {
      render(<ChatInput onSend={jest.fn()} onSlashCommand={jest.fn()} />);
      const input = screen.getByPlaceholderText('Message OpenClaw...');
      fireEvent.changeText(input, 'hello');
      expect(screen.queryByText('/clear')).toBeNull();
    });

    it('calls onSlashCommand when tapping a suggestion', () => {
      const onSlashCommand = jest.fn();
      render(<ChatInput onSend={jest.fn()} onSlashCommand={onSlashCommand} />);
      const input = screen.getByPlaceholderText('Message OpenClaw...');
      fireEvent.changeText(input, '/');
      fireEvent.press(screen.getByText('/clear'));
      expect(onSlashCommand).toHaveBeenCalledWith('/clear');
    });

    it('calls onSlashCommand when sending an exact slash command', () => {
      const onSend = jest.fn();
      const onSlashCommand = jest.fn();
      render(<ChatInput onSend={onSend} onSlashCommand={onSlashCommand} />);
      const input = screen.getByPlaceholderText('Message OpenClaw...');
      fireEvent.changeText(input, '/clear');
      fireEvent.press(screen.getByText('↑'));
      expect(onSlashCommand).toHaveBeenCalledWith('/clear');
      expect(onSend).not.toHaveBeenCalled();
    });

    it('sends regular text starting with / if not a recognized command', () => {
      const onSend = jest.fn();
      const onSlashCommand = jest.fn();
      render(<ChatInput onSend={onSend} onSlashCommand={onSlashCommand} />);
      const input = screen.getByPlaceholderText('Message OpenClaw...');
      fireEvent.changeText(input, '/unknown');
      fireEvent.press(screen.getByText('↑'));
      expect(onSend).toHaveBeenCalledWith('/unknown');
      expect(onSlashCommand).not.toHaveBeenCalled();
    });
  });

  describe('character counter', () => {
    it('does not show counter for short text', () => {
      render(<ChatInput onSend={jest.fn()} />);
      const input = screen.getByPlaceholderText('Message OpenClaw...');
      fireEvent.changeText(input, 'hello');
      expect(screen.queryByLabelText(/characters remaining/)).toBeNull();
    });

    it('shows counter when within 200 chars of limit', () => {
      render(<ChatInput onSend={jest.fn()} />);
      const input = screen.getByPlaceholderText('Message OpenClaw...');
      // 4096 - 200 = 3896, so typing 3897 chars should show counter with 199 remaining
      fireEvent.changeText(input, 'x'.repeat(3897));
      expect(screen.getByLabelText('199 characters remaining')).toBeTruthy();
      expect(screen.getByText('199')).toBeTruthy();
    });

    it('shows counter in warning color at 100 remaining', () => {
      render(<ChatInput onSend={jest.fn()} />);
      const input = screen.getByPlaceholderText('Message OpenClaw...');
      fireEvent.changeText(input, 'x'.repeat(3996));
      expect(screen.getByText('100')).toBeTruthy();
    });

    it('shows counter in error color at 50 remaining', () => {
      render(<ChatInput onSend={jest.fn()} />);
      const input = screen.getByPlaceholderText('Message OpenClaw...');
      fireEvent.changeText(input, 'x'.repeat(4046));
      expect(screen.getByText('50')).toBeTruthy();
    });

    it('shows 0 at max length', () => {
      render(<ChatInput onSend={jest.fn()} />);
      const input = screen.getByPlaceholderText('Message OpenClaw...');
      fireEvent.changeText(input, 'x'.repeat(4096));
      expect(screen.getByText('0')).toBeTruthy();
    });

    it('hides counter after sending', () => {
      render(<ChatInput onSend={jest.fn()} />);
      const input = screen.getByPlaceholderText('Message OpenClaw...');
      fireEvent.changeText(input, 'x'.repeat(3950));
      expect(screen.getByLabelText('146 characters remaining')).toBeTruthy();
      fireEvent.press(screen.getByText('↑'));
      expect(screen.queryByLabelText(/characters remaining/)).toBeNull();
    });
  });
});
