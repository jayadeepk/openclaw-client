import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ScrollToBottomFAB } from './ScrollToBottomFAB';

describe('ScrollToBottomFAB', () => {
  it('renders nothing when not visible', () => {
    const { toJSON } = render(<ScrollToBottomFAB visible={false} onPress={jest.fn()} />);
    expect(toJSON()).toBeNull();
  });

  it('renders when visible', () => {
    const { getByLabelText } = render(<ScrollToBottomFAB visible={true} onPress={jest.fn()} />);
    expect(getByLabelText('Scroll to bottom')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<ScrollToBottomFAB visible={true} onPress={onPress} />);
    fireEvent.press(getByLabelText('Scroll to bottom'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
