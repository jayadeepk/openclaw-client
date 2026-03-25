import React from 'react';
import { render } from '@testing-library/react-native';
import { AudioStopFAB } from './AudioStopFAB';

describe('AudioStopFAB snapshots', () => {
  it('visible state', () => {
    const { toJSON } = render(<AudioStopFAB visible={true} onPress={jest.fn()} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('hidden state', () => {
    const { toJSON } = render(<AudioStopFAB visible={false} onPress={jest.fn()} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
