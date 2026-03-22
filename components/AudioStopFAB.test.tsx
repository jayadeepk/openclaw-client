import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { AudioStopFAB } from './AudioStopFAB';

describe('AudioStopFAB', () => {
  it('renders nothing when not visible', () => {
    const { toJSON } = render(<AudioStopFAB visible={false} onPress={jest.fn()} />);
    expect(toJSON()).toBeNull();
  });

  it('renders when visible', () => {
    const { getByLabelText } = render(<AudioStopFAB visible={true} onPress={jest.fn()} />);
    expect(getByLabelText('Stop audio')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<AudioStopFAB visible={true} onPress={onPress} />);
    fireEvent.press(getByLabelText('Stop audio'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
