import { useCallback, useState } from 'react';
import * as Location from 'expo-location';
import { Linking } from 'react-native';

export type LocationPermissionStatus = 'undetermined' | 'granted' | 'denied';

export interface UseLocationPermissionResult {
  status: LocationPermissionStatus;
  request: () => Promise<boolean>;
  openSettings: () => void;
}

export function useLocationPermission(): UseLocationPermissionResult {
  const [status, setStatus] = useState<LocationPermissionStatus>('undetermined');

  const request = useCallback(async (): Promise<boolean> => {
    const { status: result } = await Location.requestForegroundPermissionsAsync();
    setStatus(result as LocationPermissionStatus);
    return result === 'granted';
  }, []);

  const openSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  return { status, request, openSettings };
}
