import React from 'react';
import { render } from '@testing-library/react-native';
import { SettingsScreen } from './SettingsScreen';

describe('SettingsScreen snapshots', () => {
  it('renders with default settings', () => {
    const { toJSON } = render(
      <SettingsScreen
        settings={{ gatewayHost: '192.168.1.100', gatewayPort: '18789', authToken: 'tok' }}
        onSave={jest.fn()}
        onGoBack={jest.fn()}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with empty settings', () => {
    const { toJSON } = render(
      <SettingsScreen
        settings={{ gatewayHost: '', gatewayPort: '', authToken: '' }}
        onSave={jest.fn()}
        onGoBack={jest.fn()}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
