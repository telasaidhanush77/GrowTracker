import { Linking } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';

// ── mocks ──────────────────────────────────────────────────────────────────────

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
}));

import * as Location from 'expo-location';
import { useLocationPermission } from '../../hooks/useLocationPermission';

const mockRequestForeground = Location.requestForegroundPermissionsAsync as jest.Mock;

let mockOpenSettings: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockOpenSettings = jest.spyOn(Linking, 'openSettings').mockImplementation(jest.fn());
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── initial state ─────────────────────────────────────────────────────────────

describe('useLocationPermission — initial state', () => {
  it('starts with undetermined status', () => {
    const { result } = renderHook(() => useLocationPermission());
    expect(result.current.status).toBe('undetermined');
  });
});

// ── granted path ──────────────────────────────────────────────────────────────

describe('useLocationPermission — granted path', () => {
  it('returns true and sets status to granted when permission is granted', async () => {
    mockRequestForeground.mockResolvedValue({ status: 'granted' });

    const { result } = renderHook(() => useLocationPermission());

    let granted: boolean;
    await act(async () => {
      granted = await result.current.request();
    });

    expect(granted!).toBe(true);
    expect(result.current.status).toBe('granted');
    expect(mockRequestForeground).toHaveBeenCalledTimes(1);
  });

  it('calls requestForegroundPermissionsAsync only once per request call', async () => {
    mockRequestForeground.mockResolvedValue({ status: 'granted' });

    const { result } = renderHook(() => useLocationPermission());

    await act(async () => {
      await result.current.request();
    });

    expect(mockRequestForeground).toHaveBeenCalledTimes(1);
  });
});

// ── denied path ───────────────────────────────────────────────────────────────

describe('useLocationPermission — denied path', () => {
  it('returns false and sets status to denied when permission is denied', async () => {
    mockRequestForeground.mockResolvedValue({ status: 'denied' });

    const { result } = renderHook(() => useLocationPermission());

    let granted: boolean;
    await act(async () => {
      granted = await result.current.request();
    });

    expect(granted!).toBe(false);
    expect(result.current.status).toBe('denied');
  });

  it('returns false when status is undetermined (not granted)', async () => {
    mockRequestForeground.mockResolvedValue({ status: 'undetermined' });

    const { result } = renderHook(() => useLocationPermission());

    let granted: boolean;
    await act(async () => {
      granted = await result.current.request();
    });

    expect(granted!).toBe(false);
    expect(result.current.status).toBe('undetermined');
  });
});

// ── multiple requests ─────────────────────────────────────────────────────────

describe('useLocationPermission — multiple requests', () => {
  it('reflects the most recent status when called multiple times', async () => {
    mockRequestForeground
      .mockResolvedValueOnce({ status: 'denied' })
      .mockResolvedValueOnce({ status: 'granted' });

    const { result } = renderHook(() => useLocationPermission());

    await act(async () => {
      await result.current.request();
    });
    expect(result.current.status).toBe('denied');

    await act(async () => {
      await result.current.request();
    });
    expect(result.current.status).toBe('granted');
  });
});

// ── openSettings ─────────────────────────────────────────────────────────────

describe('useLocationPermission — openSettings', () => {
  it('calls Linking.openSettings', () => {
    const { result } = renderHook(() => useLocationPermission());

    act(() => {
      result.current.openSettings();
    });

    expect(mockOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('can be called multiple times without errors', () => {
    const { result } = renderHook(() => useLocationPermission());

    act(() => {
      result.current.openSettings();
      result.current.openSettings();
    });

    expect(mockOpenSettings).toHaveBeenCalledTimes(2);
  });
});
