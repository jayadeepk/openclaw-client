import React from 'react';
import { render } from '@testing-library/react-native';
import { ChatInput } from './ChatInput';

describe('ChatInput snapshots', () => {
  it('enabled state', () => {
    const { toJSON } = render(<ChatInput onSend={jest.fn()} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('disabled state', () => {
    const { toJSON } = render(<ChatInput onSend={jest.fn()} disabled />);
    expect(toJSON()).toMatchSnapshot();
  });
});
