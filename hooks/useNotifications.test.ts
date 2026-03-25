import { renderHook, act } from '@testing-library/react-native';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useNotifications } from './useNotifications';

const mockGetPermissions = Notifications.getPermissionsAsync as jest.Mock;
const mockRequestPermissions = Notifications.requestPermissionsAsync as jest.Mock;
const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock;

let appStateCallback: ((state: string) => void) | null = null;

jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
  appStateCallback = handler as (state: string) => void;
  return { remove: jest.fn() } as ReturnType<typeof AppState.addEventListener>;
});

beforeEach(() => {
  jest.clearAllMocks();
  appStateCallback = null;
  mockGetPermissions.mockResolvedValue({ status: 'granted' });
});

describe('useNotifications', () => {
  it('requests permissions on mount', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'undetermined' });
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });

    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await new Promise((r) => { setTimeout(r, 10); });
    });

    expect(mockRequestPermissions).toHaveBeenCalled();
    expect(result.current.hasPermission).toBe(true);
  });

  it('sets hasPermission true when already granted', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'granted' });

    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await new Promise((r) => { setTimeout(r, 10); });
    });

    expect(result.current.hasPermission).toBe(true);
    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });

  it('tracks app state changes', async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await new Promise((r) => { setTimeout(r, 10); });
    });

    expect(result.current.isBackground).toBe(false);

    act(() => {
      appStateCallback?.('background');
    });
    expect(result.current.isBackground).toBe(true);

    act(() => {
      appStateCallback?.('active');
    });
    expect(result.current.isBackground).toBe(false);
  });

  it('sends a local notification', async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await new Promise((r) => { setTimeout(r, 10); });
    });

    act(() => {
      result.current.sendNotification('Title', 'Body text');
    });

    expect(mockSchedule).toHaveBeenCalledWith({
      content: { title: 'Title', body: 'Body text', sound: true },
      trigger: null,
    });
  });

  it('does not send notification without permission', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'denied' });
    mockRequestPermissions.mockResolvedValue({ status: 'denied' });

    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await new Promise((r) => { setTimeout(r, 10); });
    });

    act(() => {
      result.current.sendNotification('Title', 'Body');
    });

    expect(mockSchedule).not.toHaveBeenCalled();
  });
});
