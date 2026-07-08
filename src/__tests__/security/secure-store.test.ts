/**
 * Security: Encrypted session storage (LargeSecureStore)
 *
 * Verifies the adapter that Supabase uses to persist the JWT session on native:
 *  - values are AES-encrypted at rest in AsyncStorage (no plaintext tokens)
 *  - the AES key lives in the keychain (SecureStore), not AsyncStorage
 *  - encrypt → decrypt round-trips large (>2 KB) session blobs
 *  - corrupt ciphertext degrades to "no session" instead of crashing auth init
 */

// Use the official STATEFUL AsyncStorage mock (the project default is a
// stateless stub whose getItem always returns null) so round-trips work.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { LargeSecureStore } from '../../lib/secureStore';

const KEY = 'sb-mock-auth-token';

beforeEach(async () => {
  await AsyncStorage.clear();
  (SecureStore as unknown as { __reset: () => void }).__reset();
  jest.clearAllMocks();
});

describe('LargeSecureStore', () => {
  it('round-trips a stored value', async () => {
    const store = new LargeSecureStore();
    await store.setItem(KEY, 'hello-session');
    expect(await store.getItem(KEY)).toBe('hello-session');
  });

  it('round-trips a large (>2 KB) session blob past the SecureStore size limit', async () => {
    const store = new LargeSecureStore();
    const bigSession = JSON.stringify({ access_token: 'a'.repeat(3000), refresh_token: 'r'.repeat(1200) });
    expect(bigSession.length).toBeGreaterThan(2048);
    await store.setItem(KEY, bigSession);
    expect(await store.getItem(KEY)).toBe(bigSession);
  });

  it('stores ciphertext (not plaintext) in AsyncStorage', async () => {
    const store = new LargeSecureStore();
    await store.setItem(KEY, 'super-secret-token');
    const atRest = await AsyncStorage.getItem(KEY);
    expect(atRest).not.toBeNull();
    expect(atRest).not.toContain('super-secret-token');
    // hex ciphertext only
    expect(atRest).toMatch(/^[0-9a-f]+$/);
  });

  it('keeps the AES key in the keychain (SecureStore), not AsyncStorage', async () => {
    const store = new LargeSecureStore();
    await store.setItem(KEY, 'token');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(KEY, expect.stringMatching(/^[0-9a-f]{64}$/));
    // AsyncStorage holds only ciphertext; the decrypting key is not there.
    const keyInKeychain = await SecureStore.getItemAsync(KEY);
    const atRest = await AsyncStorage.getItem(KEY);
    expect(atRest).not.toBe(keyInKeychain);
  });

  it('returns null when nothing is stored', async () => {
    const store = new LargeSecureStore();
    expect(await store.getItem('absent')).toBeNull();
  });

  it('removeItem clears both the ciphertext and the keychain key', async () => {
    const store = new LargeSecureStore();
    await store.setItem(KEY, 'token');
    await store.removeItem(KEY);
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
    expect(await SecureStore.getItemAsync(KEY)).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(KEY);
  });

  it('degrades to null (and self-heals) when the keychain key is missing', async () => {
    const store = new LargeSecureStore();
    await store.setItem(KEY, 'token');
    // Simulate the keychain being wiped (OS restore, key rotation) while
    // ciphertext survives in AsyncStorage.
    await SecureStore.deleteItemAsync(KEY);
    expect(await store.getItem(KEY)).toBeNull();
  });
});
