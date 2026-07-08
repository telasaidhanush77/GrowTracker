import React from 'react';
import { Linking } from 'react-native';
import { renderHook, act, render, screen, fireEvent } from '@testing-library/react-native';

// ── mocks ──────────────────────────────────────────────────────────────────────

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images', Videos: 'Videos', All: 'All' },
}));

jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      rejected: '#ef4444',
      rejectedBg: '#fee2e2',
    },
  }),
}));

import * as ImagePicker from 'expo-image-picker';
import { useImagePicker } from '../../hooks/useImagePicker';
import { PermissionDeniedBanner } from '../../components/PermissionDeniedBanner';

const mockRequestCamera = ImagePicker.requestCameraPermissionsAsync as jest.Mock;
const mockRequestLibrary = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const mockLaunchCamera = ImagePicker.launchCameraAsync as jest.Mock;
const mockLaunchLibrary = ImagePicker.launchImageLibraryAsync as jest.Mock;

let mockOpenSettings: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockOpenSettings = jest.spyOn(Linking, 'openSettings').mockImplementation(jest.fn());
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── useImagePicker — camera ──────────────────────────────────────────────────

describe('useImagePicker — camera', () => {
  it('returns image when camera permission is granted', async () => {
    mockRequestCamera.mockResolvedValue({ status: 'granted' });
    mockLaunchCamera.mockResolvedValue({
      canceled: false,
      assets: [{
        uri: 'file://photo.jpg',
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        fileSize: 2048,
      }],
    });

    const { result } = renderHook(() => useImagePicker());

    let image: Awaited<ReturnType<typeof result.current.pickFromCamera>>;
    await act(async () => {
      image = await result.current.pickFromCamera();
    });

    expect(image!).toEqual({ uri: 'file://photo.jpg', name: 'photo.jpg', mimeType: 'image/jpeg', size: 2048 });
    expect(result.current.cameraStatus).toBe('granted');
    expect(mockLaunchCamera).toHaveBeenCalledWith({
      mediaTypes: 'Images',
      quality: 0.8,
      allowsEditing: false,
    });
  });

  it('returns null and sets cameraStatus to denied when camera permission is denied', async () => {
    mockRequestCamera.mockResolvedValue({ status: 'denied' });

    const { result } = renderHook(() => useImagePicker());

    let image: Awaited<ReturnType<typeof result.current.pickFromCamera>>;
    await act(async () => {
      image = await result.current.pickFromCamera();
    });

    expect(image!).toBeNull();
    expect(result.current.cameraStatus).toBe('denied');
    expect(mockLaunchCamera).not.toHaveBeenCalled();
  });

  it('returns null when user cancels the camera', async () => {
    mockRequestCamera.mockResolvedValue({ status: 'granted' });
    mockLaunchCamera.mockResolvedValue({ canceled: true, assets: [] });

    const { result } = renderHook(() => useImagePicker());

    let image: Awaited<ReturnType<typeof result.current.pickFromCamera>>;
    await act(async () => {
      image = await result.current.pickFromCamera();
    });

    expect(image!).toBeNull();
    expect(result.current.cameraStatus).toBe('granted');
  });

  it('uses fallback filename when asset has no fileName', async () => {
    mockRequestCamera.mockResolvedValue({ status: 'granted' });
    mockLaunchCamera.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://tmp.jpg', fileName: null, mimeType: 'image/jpeg', fileSize: 512 }],
    });

    const { result } = renderHook(() => useImagePicker());

    let image: Awaited<ReturnType<typeof result.current.pickFromCamera>>;
    await act(async () => {
      image = await result.current.pickFromCamera();
    });

    expect(image!.name).toMatch(/^photo_\d+\.jpg$/);
  });
});

// ── useImagePicker — library ─────────────────────────────────────────────────

describe('useImagePicker — photo library', () => {
  it('returns image when library permission is granted', async () => {
    mockRequestLibrary.mockResolvedValue({ status: 'granted' });
    mockLaunchLibrary.mockResolvedValue({
      canceled: false,
      assets: [{
        uri: 'file://image.png',
        fileName: 'image.png',
        mimeType: 'image/png',
        fileSize: 4096,
      }],
    });

    const { result } = renderHook(() => useImagePicker());

    let image: Awaited<ReturnType<typeof result.current.pickFromLibrary>>;
    await act(async () => {
      image = await result.current.pickFromLibrary();
    });

    expect(image!).toEqual({ uri: 'file://image.png', name: 'image.png', mimeType: 'image/png', size: 4096 });
    expect(result.current.libraryStatus).toBe('granted');
    expect(mockLaunchLibrary).toHaveBeenCalledWith({
      mediaTypes: 'Images',
      quality: 0.8,
      allowsEditing: false,
    });
  });

  it('returns null and sets libraryStatus to denied when library permission is denied', async () => {
    mockRequestLibrary.mockResolvedValue({ status: 'denied' });

    const { result } = renderHook(() => useImagePicker());

    let image: Awaited<ReturnType<typeof result.current.pickFromLibrary>>;
    await act(async () => {
      image = await result.current.pickFromLibrary();
    });

    expect(image!).toBeNull();
    expect(result.current.libraryStatus).toBe('denied');
    expect(mockLaunchLibrary).not.toHaveBeenCalled();
  });

  it('returns null when user cancels the library picker', async () => {
    mockRequestLibrary.mockResolvedValue({ status: 'granted' });
    mockLaunchLibrary.mockResolvedValue({ canceled: true, assets: [] });

    const { result } = renderHook(() => useImagePicker());

    let image: Awaited<ReturnType<typeof result.current.pickFromLibrary>>;
    await act(async () => {
      image = await result.current.pickFromLibrary();
    });

    expect(image!).toBeNull();
  });

  it('uses fallback filename and mimeType when asset has no fileName or mimeType', async () => {
    mockRequestLibrary.mockResolvedValue({ status: 'granted' });
    mockLaunchLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://tmp.jpg', fileName: null, mimeType: null, fileSize: undefined }],
    });

    const { result } = renderHook(() => useImagePicker());

    let image: Awaited<ReturnType<typeof result.current.pickFromLibrary>>;
    await act(async () => {
      image = await result.current.pickFromLibrary();
    });

    expect(image!.name).toMatch(/^image_\d+\.jpg$/);
    expect(image!.mimeType).toBe('image/jpeg');
    expect(image!.size).toBeUndefined();
  });
});

// ── useImagePicker — openSettings ────────────────────────────────────────────

describe('useImagePicker — openSettings', () => {
  it('calls Linking.openSettings when openSettings is invoked', () => {
    const { result } = renderHook(() => useImagePicker());

    act(() => {
      result.current.openSettings();
    });

    expect(mockOpenSettings).toHaveBeenCalledTimes(1);
  });
});

// ── useImagePicker — initial state ───────────────────────────────────────────

describe('useImagePicker — initial state', () => {
  it('starts with undetermined status for both camera and library', () => {
    const { result } = renderHook(() => useImagePicker());
    expect(result.current.cameraStatus).toBe('undetermined');
    expect(result.current.libraryStatus).toBe('undetermined');
  });
});

// ── PermissionDeniedBanner ───────────────────────────────────────────────────

describe('PermissionDeniedBanner', () => {
  it('renders the message and Open Settings button', () => {
    render(
      <PermissionDeniedBanner
        message="Camera access denied. Enable it in Settings."
        onOpenSettings={jest.fn()}
      />
    );

    expect(screen.getByText('Camera access denied. Enable it in Settings.')).toBeTruthy();
    expect(screen.getByTestId('open-settings-btn')).toBeTruthy();
    expect(screen.getByText('Open Settings')).toBeTruthy();
  });

  it('calls onOpenSettings when the button is pressed', () => {
    const onOpenSettings = jest.fn();
    render(
      <PermissionDeniedBanner
        message="Permission denied."
        onOpenSettings={onOpenSettings}
      />
    );

    fireEvent.press(screen.getByTestId('open-settings-btn'));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('shows the banner container with testID', () => {
    render(
      <PermissionDeniedBanner
        message="Denied."
        onOpenSettings={jest.fn()}
      />
    );
    expect(screen.getByTestId('permission-denied-banner')).toBeTruthy();
  });
});
