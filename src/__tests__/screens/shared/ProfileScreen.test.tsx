import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import type { ScreenProps } from '../../../types';

jest.mock('../../../context/AppContext', () => ({ useApp: jest.fn() }));
jest.mock('../../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../context/ToastContext', () => ({ useToast: jest.fn() }));
jest.mock('../../../components/Header', () => {
  const { View, Text } = require('react-native');
  return ({ title }: any) => (
    <View testID="header"><Text testID="header-title">{title}</Text></View>
  );
});
jest.mock('../../../components/charts/ProgressRing', () => () => null);
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
  launchCameraAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: false }),
}));

import { useApp } from '../../../context/AppContext';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import ProfileScreen from '../../../screens/shared/ProfileScreen';

const MOCK_COLORS: any = {
  bg: '#111', bgElevated: '#1a1a1a', card: '#222', border: '#333',
  divider: '#444', textPrimary: '#fff', textSecondary: '#ccc', textMuted: '#999',
  primary: '#4f46e5', employeePrimary: '#4f46e5',
  approved: '#22c55e', approvedBg: '#dcfce7',
  rejected: '#ef4444', rejectedBg: '#fee2e2',
  pending: '#f59e0b', pendingBg: '#fef3c7',
  chartTrack: '#e5e7eb',
};

const EMPLOYEE = {
  id: 'emp-1', name: 'Alice Smith', firstName: 'Alice', lastName: 'Smith',
  email: 'alice@test.com', role: 'employee' as const, managerId: 'mgr-1',
  department: 'Engineering', designation: 'Software Engineer',
  joinDate: '2024-01-01', status: 'active' as const, avatarInitials: 'AS',
};

const MANAGER = {
  id: 'mgr-1', name: 'Bob Manager', email: 'bob@test.com',
  role: 'manager' as const, managerId: null,
  department: 'Engineering', designation: 'Engineering Manager',
  joinDate: '2022-01-01', status: 'active' as const, avatarInitials: 'BM',
};

function makeProps(overrides: Partial<ScreenProps> = {}): ScreenProps {
  return {
    navigation: { navigate: jest.fn(), goBack: jest.fn() },
    params: {},
    currentUserId: 'emp-1',
    currentRole: 'employee',
    onLogout: jest.fn(),
    ...overrides,
  };
}

const mockToggleTheme = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS, isDark: true, toggleTheme: mockToggleTheme });
  (useApp as jest.Mock).mockReturnValue({ employees: [EMPLOYEE, MANAGER], goals: [], notifications: [] });
  (useAuth as jest.Mock).mockReturnValue({ updateUser: jest.fn(), users: [EMPLOYEE, MANAGER] });
  (useToast as jest.Mock).mockReturnValue({ showToast: jest.fn() });
});

describe('ProfileScreen', () => {
  it('renders "Profile & Settings" heading', () => {
    render(<ProfileScreen {...makeProps()} />);
    expect(screen.getByTestId('header-title').props.children).toBe('Profile & Settings');
  });

  it('renders user full name', () => {
    render(<ProfileScreen {...makeProps()} />);
    expect(screen.getByText('Alice Smith')).toBeTruthy();
  });

  it('renders user designation', () => {
    render(<ProfileScreen {...makeProps()} />);
    expect(screen.getByText('Software Engineer')).toBeTruthy();
  });

  it('renders user email', () => {
    render(<ProfileScreen {...makeProps()} />);
    expect(screen.getByText('alice@test.com')).toBeTruthy();
  });

  it('shows manager name in "Reports To" row', () => {
    render(<ProfileScreen {...makeProps()} />);
    expect(screen.getByText(/Bob Manager/)).toBeTruthy();
  });

  it('shows Sign Out button', () => {
    render(<ProfileScreen {...makeProps()} />);
    expect(screen.getByText('Sign Out')).toBeTruthy();
  });

  it('calls onLogout when Sign Out is pressed', () => {
    const onLogout = jest.fn();
    render(<ProfileScreen {...makeProps({ onLogout })} />);
    fireEvent.press(screen.getByText('Sign Out'));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('shows department badge', () => {
    render(<ProfileScreen {...makeProps()} />);
    expect(screen.getByText('Engineering')).toBeTruthy();
  });

  it('shows Preferences section with Notifications', () => {
    render(<ProfileScreen {...makeProps()} />);
    expect(screen.getByText('Preferences')).toBeTruthy();
    expect(screen.getByText('Notifications')).toBeTruthy();
  });

  it('shows Switch Account when onSwitchAccount is provided', () => {
    render(<ProfileScreen {...makeProps({ onSwitchAccount: jest.fn() })} />);
    expect(screen.getByText('Switch Account')).toBeTruthy();
  });

  it('does not render when user not found', () => {
    (useApp as jest.Mock).mockReturnValue({ employees: [], goals: [], notifications: [] });
    (useAuth as jest.Mock).mockReturnValue({ updateUser: jest.fn(), users: [] });
    const { toJSON } = render(<ProfileScreen {...makeProps()} />);
    expect(toJSON()).toBeNull();
  });

  it('shows camera button in avatar area', () => {
    render(<ProfileScreen {...makeProps()} />);
    expect(screen.getByText('camera')).toBeTruthy();
  });

  it('opens edit profile panel when Edit Profile is pressed', () => {
    render(<ProfileScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Edit Profile'));
    expect(screen.getByText('Edit Profile', { exact: false })).toBeTruthy();
    expect(screen.getByDisplayValue('Alice')).toBeTruthy();
    expect(screen.getByDisplayValue('Smith')).toBeTruthy();
  });

  it('closes edit panel when Cancel is pressed', () => {
    render(<ProfileScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Edit Profile'));
    fireEvent.press(screen.getByText('Cancel'));
    expect(screen.queryByDisplayValue('Alice')).toBeNull();
  });

  it('calls updateUser when Save Changes is pressed with valid fields', async () => {
    const mockUpdateUser = jest.fn().mockResolvedValue(undefined);
    (useAuth as jest.Mock).mockReturnValue({ updateUser: mockUpdateUser, users: [EMPLOYEE, MANAGER] });
    render(<ProfileScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Edit Profile'));
    fireEvent.changeText(screen.getByDisplayValue('Alice'), 'Alicia');
    fireEvent.press(screen.getByText('Save Changes'));
    await Promise.resolve();
    expect(mockUpdateUser).toHaveBeenCalledWith('emp-1', expect.objectContaining({ firstName: 'Alicia' }));
  });

  it('shows error when saving with empty first name', async () => {
    render(<ProfileScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Edit Profile'));
    fireEvent.changeText(screen.getByDisplayValue('Alice'), '');
    fireEvent.press(screen.getByText('Save Changes'));
    await Promise.resolve();
    expect(screen.getByText(/First and last name are required/)).toBeTruthy();
  });

  it('shows performance card for employee with approved goals', () => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [EMPLOYEE, MANAGER],
      goals: [{
        id: 'g1', employeeId: 'emp-1', status: 'approved', weight: 50, quarter: 'Q1',
        managerRating: 4,
      }],
      notifications: [],
    });
    render(<ProfileScreen {...makeProps()} />);
    expect(screen.getByText('APPROVAL\nRATE')).toBeTruthy();
    expect(screen.getByText('Q1 Score')).toBeTruthy();
    expect(screen.getByText('Q2 Score')).toBeTruthy();
  });

  it('navigates to notifications when Notifications is pressed', () => {
    const navigate = jest.fn();
    render(<ProfileScreen {...{ ...makeProps(), navigation: { navigate, goBack: jest.fn() } }} />);
    fireEvent.press(screen.getByText('Notifications'));
    expect(navigate).toHaveBeenCalledWith('notifications');
  });

  it('navigates to privacy-security when Change Password is pressed', () => {
    const navigate = jest.fn();
    render(<ProfileScreen {...{ ...makeProps(), navigation: { navigate, goBack: jest.fn() } }} />);
    fireEvent.press(screen.getByText('Change Password'));
    expect(navigate).toHaveBeenCalledWith('privacy-security');
  });

  it('shows unread notification count badge', () => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [EMPLOYEE, MANAGER],
      goals: [],
      notifications: [{ id: 'n1', recipientId: 'emp-1', read: false }],
    });
    render(<ProfileScreen {...makeProps()} />);
    expect(screen.getByText('1 unread')).toBeTruthy();
  });

  it('shows manager view without performance card', () => {
    (useApp as jest.Mock).mockReturnValue({ employees: [MANAGER], goals: [], notifications: [] });
    (useAuth as jest.Mock).mockReturnValue({ updateUser: jest.fn(), users: [MANAGER] });
    render(<ProfileScreen {...{
      ...makeProps(),
      currentUserId: 'mgr-1',
      currentRole: 'manager',
    }} />);
    expect(screen.getByText('Bob Manager')).toBeTruthy();
    expect(screen.queryByText('APPROVAL\nRATE')).toBeNull();
  });

  it('shows error when saving with empty department', async () => {
    render(<ProfileScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Edit Profile'));
    fireEvent.changeText(screen.getByDisplayValue('Engineering'), '');
    fireEvent.press(screen.getByText('Save Changes'));
    await Promise.resolve();
    expect(screen.getByText(/Department and designation are required/)).toBeTruthy();
  });

  it('shows save error when updateUser throws', async () => {
    const mockUpdateUser = jest.fn().mockRejectedValue(new Error('Server error'));
    (useAuth as jest.Mock).mockReturnValue({ updateUser: mockUpdateUser, users: [EMPLOYEE, MANAGER] });
    render(<ProfileScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Edit Profile'));
    fireEvent.press(screen.getByText('Save Changes'));
    await waitFor(() => expect(screen.getByText('Server error')).toBeTruthy());
  });

  it('navigates to privacy-security when Privacy & Security settings item pressed', () => {
    const navigate = jest.fn();
    render(<ProfileScreen {...{ ...makeProps(), navigation: { navigate, goBack: jest.fn() } }} />);
    const items = screen.getAllByText('Privacy & Security');
    fireEvent.press(items[0]);
    expect(navigate).toHaveBeenCalledWith('privacy-security');
  });

  it('shows Help & Support Alert when Help & Support is pressed', () => {
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});
    render(<ProfileScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Help & Support'));
    expect(alertSpy).toHaveBeenCalledWith('Help & Support', expect.any(String), expect.any(Array));
    alertSpy.mockRestore();
  });

  it('navigates to privacy-security when Privacy Terms & Security item pressed', () => {
    const navigate = jest.fn();
    render(<ProfileScreen {...{ ...makeProps(), navigation: { navigate, goBack: jest.fn() } }} />);
    fireEvent.press(screen.getByText('Privacy, Terms & Security'));
    expect(navigate).toHaveBeenCalledWith('privacy-security');
  });

  it('opens profile photo Alert when camera button is pressed', () => {
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});
    render(<ProfileScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('camera'));
    expect(alertSpy).toHaveBeenCalledWith('Profile Photo', 'Choose an option', expect.any(Array));
    alertSpy.mockRestore();
  });

  it('calls launchImageLibraryAsync when Choose from Library is selected', async () => {
    const ImagePicker = require('expo-image-picker');
    ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://photo.jpg' }],
    });
    let capturedButtons: any[] = [];
    jest.spyOn(require('react-native').Alert, 'alert')
      .mockImplementation((_t: any, _m: any, btns: any) => { capturedButtons = btns; });
    render(<ProfileScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('camera'));
    await capturedButtons.find((b: any) => b.text === 'Choose from Library')?.onPress?.();
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('shows Permission Required alert when camera permission is denied', async () => {
    const ImagePicker = require('expo-image-picker');
    ImagePicker.requestCameraPermissionsAsync.mockResolvedValueOnce({ granted: false });
    let capturedPhotoButtons: any[] = [];
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert')
      .mockImplementation((_t: any, _m: any, btns: any) => { capturedPhotoButtons = btns; });
    render(<ProfileScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('camera'));
    await capturedPhotoButtons.find((b: any) => b.text === 'Take Photo')?.onPress?.();
    expect(alertSpy).toHaveBeenCalledWith('Permission Required', expect.any(String));
    jest.restoreAllMocks();
  });

  it('calls launchCameraAsync when permission is granted and Take Photo selected', async () => {
    const ImagePicker = require('expo-image-picker');
    ImagePicker.requestCameraPermissionsAsync.mockResolvedValueOnce({ granted: true });
    ImagePicker.launchCameraAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://photo2.jpg' }],
    });
    let capturedPhotoButtons: any[] = [];
    jest.spyOn(require('react-native').Alert, 'alert')
      .mockImplementation((_t: any, _m: any, btns: any) => { capturedPhotoButtons = btns; });
    render(<ProfileScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('camera'));
    await capturedPhotoButtons.find((b: any) => b.text === 'Take Photo')?.onPress?.();
    expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('removes avatar when Remove Photo is selected', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    AsyncStorage.getItem.mockResolvedValueOnce('file://existing.jpg');
    let capturedPhotoButtons: any[] = [];
    jest.spyOn(require('react-native').Alert, 'alert')
      .mockImplementation((_t: any, _m: any, btns: any) => { capturedPhotoButtons = btns; });
    render(<ProfileScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('camera'));
    await waitFor(() => {
      capturedPhotoButtons.find((b: any) => b.text === 'Remove Photo')?.onPress?.();
    });
    jest.restoreAllMocks();
  });
});
