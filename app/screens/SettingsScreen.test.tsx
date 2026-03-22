import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SettingsScreen } from './SettingsScreen';
import { AppSettings } from '../../types';

const defaultSettings: AppSettings = {
  gatewayHost: '192.168.1.100',
  gatewayPort: '18789',
  authToken: 'test-token',
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('SettingsScreen', () => {
  it('renders with initial settings values', () => {
    render(<SettingsScreen settings={defaultSettings} onSave={jest.fn()} onGoBack={jest.fn()} />);
    const inputs = screen.getAllByDisplayValue(/.+/);
    const values = inputs.map((i) => i.props.value);
    expect(values).toContain('192.168.1.100');
    expect(values).toContain('18789');
  });

  it('calls onSave with trimmed values on valid save', () => {
    const onSave = jest.fn();
    const onGoBack = jest.fn();
    render(<SettingsScreen settings={defaultSettings} onSave={onSave} onGoBack={onGoBack} />);
    fireEvent.press(screen.getByText('Save & Connect'));
    expect(onSave).toHaveBeenCalledWith({
      gatewayHost: '192.168.1.100',
      gatewayPort: '18789',
      authToken: 'test-token',
    });
  });

  it('calls onGoBack after save', () => {
    const onGoBack = jest.fn();
    render(<SettingsScreen settings={defaultSettings} onSave={jest.fn()} onGoBack={onGoBack} />);
    fireEvent.press(screen.getByText('Save & Connect'));
    expect(onGoBack).toHaveBeenCalled();
  });

  it('shows alert when host is empty', () => {
    const onSave = jest.fn();
    render(
      <SettingsScreen
        settings={{ ...defaultSettings, gatewayHost: '' }}
        onSave={onSave}
        onGoBack={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByText('Save & Connect'));
    expect(Alert.alert).toHaveBeenCalledWith('Validation', 'Gateway host is required.');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows alert when port is non-numeric', () => {
    const onSave = jest.fn();
    render(
      <SettingsScreen
        settings={{ ...defaultSettings, gatewayPort: 'abc' }}
        onSave={onSave}
        onGoBack={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByText('Save & Connect'));
    expect(Alert.alert).toHaveBeenCalledWith('Validation', 'Port must be a valid number.');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows alert when port is empty', () => {
    const onSave = jest.fn();
    render(
      <SettingsScreen
        settings={{ ...defaultSettings, gatewayPort: '' }}
        onSave={onSave}
        onGoBack={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByText('Save & Connect'));
    expect(Alert.alert).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('back button calls onGoBack', () => {
    const onGoBack = jest.fn();
    render(<SettingsScreen settings={defaultSettings} onSave={jest.fn()} onGoBack={onGoBack} />);
    fireEvent.press(screen.getByText('← Back'));
    expect(onGoBack).toHaveBeenCalled();
  });
});
