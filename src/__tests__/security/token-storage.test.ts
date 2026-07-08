/**
 * Security: Token & Credential Storage
 *
 * Supabase JS v2 uses the `storage` adapter passed in createClient() to persist
 * the auth session (JWT access + refresh token). This project configures it with
 * AsyncStorage, which is UNENCRYPTED on Android (plain SQLite). Migrating to
 * expo-secure-store would encrypt tokens in the OS keychain.
 *
 * These tests document the current storage behaviour and enforce that no raw
 * passwords or plaintext tokens end up in places they shouldn't.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as path from 'path';
import * as fs from 'fs';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Re-require storage helpers AFTER AsyncStorage is mocked so the mock is active.
// (They import AsyncStorage at module level, so the mock must be in place first.)
const { sessionStore, userStore, otpStore } =
  jest.requireActual<typeof import('../../auth/storage')>('../../auth/storage');

const MOCK_SESSION = {
  userId: 'u-1',
  role: 'employee' as const,
  email: 'alice@test.com',
};

const MOCK_USER = {
  id: 'u-1',
  employeeCode: 'EMP-001',
  firstName: 'Alice',
  lastName: 'Brown',
  name: 'Alice Brown',
  email: 'alice@test.com',
  username: 'alice.brown',
  role: 'employee' as const,
  department: 'Engineering',
  designation: 'Engineer',
  avatarInitials: 'AB',
  // Supabase manages auth; we never store the real password hash client-side.
  passwordHash: '',
  createdAt: '2026-01-01T00:00:00Z',
  status: 'active' as const,
  joinDate: '2026-01-01',
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

// ── Supabase configuration ────────────────────────────────────────────────────

describe('Supabase auth storage configuration', () => {
  it('uses the encrypted, keychain-backed session adapter (not raw AsyncStorage)', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../lib/supabase.ts'),
      'utf8',
    );
    // Session persistence goes through sessionStorageAdapter, which on native
    // AES-encrypts the JWT and keeps the key in the OS keychain (SecureStore).
    expect(src).toContain('storage: sessionStorageAdapter');
    // The raw AsyncStorage adapter must no longer back the auth session.
    expect(src).not.toContain('storage: AsyncStorage');
  });

  it('secureStore adapter is keychain-backed via expo-secure-store', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../lib/secureStore.ts'),
      'utf8',
    );
    expect(src).toContain("from 'expo-secure-store'");
    // AES encryption of the value before it lands in AsyncStorage.
    expect(src).toContain('aes-js');
    // Web has no keychain — falls back to AsyncStorage there.
    expect(src).toContain("Platform.OS === 'web'");
  });

  it('does not hardcode Supabase credentials in source', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../lib/supabase.ts'),
      'utf8',
    );
    // Values must come from env vars, not literals.
    expect(src).toContain('process.env.EXPO_PUBLIC_SUPABASE_URL');
    expect(src).toContain('process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY');
    // No production URL or JWT literal hardcoded.
    expect(src).not.toMatch(/https:\/\/[a-z]{20}\.supabase\.co/);
    expect(src).not.toMatch(/eyJ[A-Za-z0-9+/]{50,}/); // base64-looking JWT
  });
});

// ── Session store ─────────────────────────────────────────────────────────────

describe('sessionStore', () => {
  it('writes session to the @gt:session key in AsyncStorage', async () => {
    const spy = jest.spyOn(AsyncStorage, 'setItem');
    await sessionStore.save(MOCK_SESSION as any);
    expect(spy).toHaveBeenCalledWith('@gt:session', expect.any(String));
  });

  it('stores session as valid JSON', async () => {
    await sessionStore.save(MOCK_SESSION as any);
    const raw = await AsyncStorage.getItem('@gt:session');
    expect(() => JSON.parse(raw!)).not.toThrow();
    const parsed = JSON.parse(raw!);
    expect(parsed.userId).toBe('u-1');
    expect(parsed.email).toBe('alice@test.com');
  });

  it('save(null) removes the @gt:session key', async () => {
    await sessionStore.save(MOCK_SESSION as any);
    await sessionStore.save(null);
    const raw = await AsyncStorage.getItem('@gt:session');
    expect(raw).toBeNull();
  });

  it('get() returns null when no session is stored', async () => {
    const session = await sessionStore.get();
    expect(session).toBeNull();
  });
});

// ── User store ────────────────────────────────────────────────────────────────

describe('userStore — password safety', () => {
  it('stores passwordHash as empty string for Supabase-managed users', async () => {
    await userStore.save([MOCK_USER as any]);
    const raw = await AsyncStorage.getItem('@gt:users');
    const stored = JSON.parse(raw!);
    expect(stored[0].passwordHash).toBe('');
  });

  it('never adds a "password" field to stored users', async () => {
    await userStore.save([MOCK_USER as any]);
    const raw = await AsyncStorage.getItem('@gt:users');
    const stored = JSON.parse(raw!);
    expect(Object.keys(stored[0])).not.toContain('password');
  });

  it('returns empty array when user store is empty', async () => {
    const users = await userStore.getAll();
    expect(users).toEqual([]);
  });
});

// ── OTP store ─────────────────────────────────────────────────────────────────

describe('otpStore — expiry enforcement', () => {
  it('OTP records are saved with an expiresAt field', async () => {
    const now = new Date();
    const record = {
      email: 'alice@test.com',
      otp: '123456',
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
    };
    await otpStore.save([record]);
    const stored = await otpStore.getAll();
    expect(stored[0]).toHaveProperty('expiresAt');
    expect(new Date(stored[0].expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('OTP is stored as a 6-digit string, not a numeric value', async () => {
    const record = {
      email: 'alice@test.com',
      otp: '007890',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    };
    await otpStore.save([record]);
    const stored = await otpStore.getAll();
    expect(typeof stored[0].otp).toBe('string');
    expect(stored[0].otp).toBe('007890'); // leading zero preserved
  });

  it('returns empty array when OTP store is empty', async () => {
    expect(await otpStore.getAll()).toEqual([]);
  });
});

// ── Key namespacing ───────────────────────────────────────────────────────────

describe('Storage key namespacing', () => {
  it('all writes use the @gt: namespace prefix', async () => {
    await sessionStore.save(MOCK_SESSION as any);
    await userStore.save([MOCK_USER as any]);
    const keys = await AsyncStorage.getAllKeys();
    const unknown = keys.filter(k => !k.startsWith('@gt:') && !k.startsWith('@tanstack'));
    expect(unknown).toHaveLength(0);
  });

  it('React Query persister uses namespaced key @gt:query-cache', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../lib/queryClient.ts'),
      'utf8',
    );
    expect(src).toContain('@gt:query-cache');
  });
});
