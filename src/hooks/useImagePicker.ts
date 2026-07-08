import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Linking } from 'react-native';

export type ImagePermissionStatus = 'undetermined' | 'granted' | 'denied';

export interface PickedImage {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

export interface UseImagePickerResult {
  cameraStatus: ImagePermissionStatus;
  libraryStatus: ImagePermissionStatus;
  pickFromCamera: () => Promise<PickedImage | null>;
  pickFromLibrary: () => Promise<PickedImage | null>;
  openSettings: () => void;
}

function assetToPickedImage(asset: ImagePicker.ImagePickerAsset, fallbackName: string): PickedImage {
  return {
    uri: asset.uri,
    name: asset.fileName ?? fallbackName,
    mimeType: asset.mimeType ?? 'image/jpeg',
    size: asset.fileSize,
  };
}

export function useImagePicker(): UseImagePickerResult {
  const [cameraStatus, setCameraStatus] = useState<ImagePermissionStatus>('undetermined');
  const [libraryStatus, setLibraryStatus] = useState<ImagePermissionStatus>('undetermined');

  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    setCameraStatus(status as ImagePermissionStatus);
    return status === 'granted';
  }, []);

  const requestLibraryPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    setLibraryStatus(status as ImagePermissionStatus);
    return status === 'granted';
  }, []);

  const pickFromCamera = useCallback(async (): Promise<PickedImage | null> => {
    const granted = await requestCameraPermission();
    if (!granted) return null;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]) return null;
    return assetToPickedImage(result.assets[0], `photo_${Date.now()}.jpg`);
  }, [requestCameraPermission]);

  const pickFromLibrary = useCallback(async (): Promise<PickedImage | null> => {
    const granted = await requestLibraryPermission();
    if (!granted) return null;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]) return null;
    return assetToPickedImage(result.assets[0], `image_${Date.now()}.jpg`);
  }, [requestLibraryPermission]);

  const openSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  return { cameraStatus, libraryStatus, pickFromCamera, pickFromLibrary, openSettings };
}
