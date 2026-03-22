import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ConnectionBadge } from './ConnectionBadge';
import { ConnectionStatus } from '../types';

const cases: [ConnectionStatus, string][] = [
  ['connected', 'Connected'],
  ['connecting', 'Connecting...'],
  ['authenticating', 'Authenticating...'],
  ['disconnected', 'Disconnected'],
  ['error', 'Connection Error'],
];

describe('ConnectionBadge', () => {
  it.each(cases)('shows "%s" label for %s status', (status, label) => {
    render(<ConnectionBadge status={status} />);
    expect(screen.getByText(label)).toBeTruthy();
  });
});
