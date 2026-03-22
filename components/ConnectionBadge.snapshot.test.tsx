import React from 'react';
import { render } from '@testing-library/react-native';
import { ConnectionBadge } from './ConnectionBadge';
import { ConnectionStatus } from '../types';

const statuses: ConnectionStatus[] = ['connected', 'connecting', 'authenticating', 'disconnected', 'error'];

describe('ConnectionBadge snapshots', () => {
  it.each(statuses)('%s status', (status) => {
    const { toJSON } = render(<ConnectionBadge status={status} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
