import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from './ThemeContext';
import { FontSizeLabel } from '../constants/theme';

// Override the global mock from jest.setup.ts for this file
jest.unmock('./ThemeContext');

function TestConsumer() {
  const { theme, toggleTheme, setFontSize } = useTheme();
  return (
    <>
      <Text testID="mode">{theme.mode}</Text>
      <Text testID="fontSizeLabel">{theme.fontSizeLabel}</Text>
      <Text testID="fontSizeMd">{String(theme.fontSize.md)}</Text>
      <Text testID="toggle" onPress={toggleTheme}>toggle</Text>
      <Text testID="setSmall" onPress={() => { setFontSize('small'); }}>small</Text>
      <Text testID="setLarge" onPress={() => { setFontSize('large'); }}>large</Text>
      <Text testID="setXL" onPress={() => { setFontSize('extra-large'); }}>xl</Text>
    </>
  );
}

describe('ThemeContext', () => {
  it('provides default theme with medium font size', () => {
    render(
      <ThemeProvider initialMode="dark" initialFontSize="medium">
        <TestConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('mode').props.children).toBe('dark');
    expect(screen.getByTestId('fontSizeLabel').props.children).toBe('medium');
    expect(screen.getByTestId('fontSizeMd').props.children).toBe('15');
  });

  it('scales font sizes when set to small', () => {
    render(
      <ThemeProvider initialMode="dark" initialFontSize="small">
        <TestConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('fontSizeLabel').props.children).toBe('small');
    // 15 * 0.85 = 12.75 → rounded to 13
    expect(screen.getByTestId('fontSizeMd').props.children).toBe('13');
  });

  it('scales font sizes when set to large', () => {
    render(
      <ThemeProvider initialMode="dark" initialFontSize="large">
        <TestConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('fontSizeLabel').props.children).toBe('large');
    // 15 * 1.2 = 18
    expect(screen.getByTestId('fontSizeMd').props.children).toBe('18');
  });

  it('changes font size via setFontSize', () => {
    render(
      <ThemeProvider initialMode="dark" initialFontSize="medium">
        <TestConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('fontSizeLabel').props.children).toBe('medium');

    act(() => {
      fireEvent.press(screen.getByTestId('setLarge'));
    });
    expect(screen.getByTestId('fontSizeLabel').props.children).toBe('large');
  });

  it('toggles theme mode', () => {
    render(
      <ThemeProvider initialMode="dark" initialFontSize="medium">
        <TestConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('mode').props.children).toBe('dark');

    act(() => {
      fireEvent.press(screen.getByTestId('toggle'));
    });
    expect(screen.getByTestId('mode').props.children).toBe('light');
  });

  it('throws when useTheme is used outside ThemeProvider', () => {
    // Suppress console.error for this test
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useTheme must be used within ThemeProvider');
    spy.mockRestore();
  });
});
