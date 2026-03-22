import { Platform, Vibration } from 'react-native';
import { lightTap } from './haptics';

describe('lightTap', () => {
  let vibrateSpy: jest.SpyInstance;

  beforeEach(() => {
    vibrateSpy = jest.spyOn(Vibration, 'vibrate').mockImplementation();
  });

  afterEach(() => {
    vibrateSpy.mockRestore();
  });

  it('vibrates for 10ms on native', () => {
    lightTap();
    expect(vibrateSpy).toHaveBeenCalledWith(10);
  });

  it('does not vibrate on web', () => {
    const original = Platform.OS;
    (Platform as { OS: string }).OS = 'web';
    lightTap();
    expect(vibrateSpy).not.toHaveBeenCalled();
    (Platform as { OS: string }).OS = original;
  });
});
