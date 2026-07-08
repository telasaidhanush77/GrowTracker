import { Linking } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';

// ── mocks ──────────────────────────────────────────────────────────────────────

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { MAX: 5 },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { isDevice: false },
}));

import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { usePushNotifications } from '../../hooks/usePushNotifications';

const mockGetPermissions = Notifications.getPermissionsAsync as jest.Mock;
const mockRequestPermissions = Notifications.requestPermissionsAsync as jest.Mock;
const mockGetPushToken = Notifications.getExpoPushTokenAsync as jest.Mock;
const mockSetChannel = Notifications.setNotificationChannelAsync as jest.Mock;

let mockOpenSettings: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockSetChannel.mockResolvedValue(null);
  mockOpenSettings = jest.spyOn(Linking, 'openSettings').mockImplementation(jest.fn());
  Constants.isDevice = false;
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── initial state ─────────────────────────────────────────────────────────────

describe('usePushNotifications — initial state', () => {
  it('starts with undetermined status and null token', () => {
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.status).toBe('undetermined');
    expect(result.current.pushToken).toBeNull();
  });
});

// ── register — permission already granted ────────────────────────────────────

describe('usePushNotifications — register when already granted', () => {
  it('does not call requestPermissionsAsync when already granted', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'granted' });

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.register();
    });

    expect(mockRequestPermissions).not.toHaveBeenCalled();
    expect(result.current.status).toBe('granted');
  });
});

// ── register — permission not yet granted ────────────────────────────────────

describe('usePushNotifications — register when undetermined', () => {
  it('requests permission when status is undetermined and sets granted', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'undetermined' });
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.register();
    });

    expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('granted');
  });
});

// ── register — denied path ───────────────────────────────────────────────────

describe('usePushNotifications — register when denied', () => {
  it('sets status to denied when user denies the permission prompt', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'undetermined' });
    mockRequestPermissions.mockResolvedValue({ status: 'denied' });

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.register();
    });

    expect(result.current.status).toBe('denied');
    expect(result.current.pushToken).toBeNull();
    expect(mockGetPushToken).not.toHaveBeenCalled();
  });

  it('does not attempt to fetch a push token when permission is denied', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'denied' });

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.register();
    });

    expect(mockGetPushToken).not.toHaveBeenCalled();
    expect(result.current.pushToken).toBeNull();
  });
});

// ── register — push token on device ──────────────────────────────────────────

describe('usePushNotifications — push token (physical device)', () => {
  beforeEach(() => {
    Constants.isDevice = true;
  });

  it('fetches push token when granted on a physical device', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'granted' });
    mockGetPushToken.mockResolvedValue({ data: 'ExponentPushToken[xxxxxx]' });

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.register();
    });

    expect(mockGetPushToken).toHaveBeenCalledTimes(1);
    expect(result.current.pushToken).toBe('ExponentPushToken[xxxxxx]');
  });

  it('leaves pushToken null when getExpoPushTokenAsync throws', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'granted' });
    mockGetPushToken.mockRejectedValue(new Error('No project ID'));

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.register();
    });

    expect(result.current.pushToken).toBeNull();
  });
});

// ── register — simulator skips token fetch ───────────────────────────────────

describe('usePushNotifications — simulator (isDevice = false)', () => {
  it('skips getExpoPushTokenAsync on a simulator even when granted', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'granted' });

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.register();
    });

    expect(mockGetPushToken).not.toHaveBeenCalled();
    expect(result.current.pushToken).toBeNull();
  });
});

// ── openSettings ─────────────────────────────────────────────────────────────

describe('usePushNotifications — openSettings', () => {
  it('calls Linking.openSettings', () => {
    const { result } = renderHook(() => usePushNotifications());

    act(() => {
      result.current.openSettings();
    });

    expect(mockOpenSettings).toHaveBeenCalledTimes(1);
  });
});
