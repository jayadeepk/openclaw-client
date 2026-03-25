import React from 'react';
import { render } from '@testing-library/react-native';
import { ScrollToBottomFAB } from './ScrollToBottomFAB';

describe('ScrollToBottomFAB snapshots', () => {
  it('visible state', () => {
    const { toJSON } = render(<ScrollToBottomFAB visible={true} onPress={jest.fn()} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('hidden state', () => {
    const { toJSON } = render(<ScrollToBottomFAB visible={false} onPress={jest.fn()} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
