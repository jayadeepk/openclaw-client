import { renderHook, act } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import { useNetworkStatus } from './useNetworkStatus';

const mockAddEventListener = NetInfo.addEventListener as jest.Mock;

describe('useNetworkStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defaults to true (online)', () => {
    mockAddEventListener.mockReturnValue(jest.fn());
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current).toBe(true);
  });

  it('updates when network state changes', () => {
    let callback: (state: { isConnected: boolean }) => void = () => {};
    mockAddEventListener.mockImplementation((cb: typeof callback) => {
      callback = cb;
      return jest.fn();
    });

    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current).toBe(true);

    act(() => { callback({ isConnected: false }); });
    expect(result.current).toBe(false);

    act(() => { callback({ isConnected: true }); });
    expect(result.current).toBe(true);
  });

  it('unsubscribes on unmount', () => {
    const unsubscribe = jest.fn();
    mockAddEventListener.mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => useNetworkStatus());
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
