import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import aesjs from 'aes-js';
import 'react-native-get-random-values';

/**
 * Encrypted session storage adapter for Supabase auth.
 *
 * Problem: Supabase persists the JWT access + refresh token via the `storage`
 * adapter. Raw AsyncStorage is unencrypted (plain SQLite on Android) — anyone
 * with root/ADB/backup access can read the tokens. expo-secure-store encrypts
 * via the OS keychain (iOS Keychain / Android Keystore) but caps values at
 * ~2 KB, and a Supabase session frequently exceeds that.
 *
 * Solution (the pattern documented by Supabase for Expo): generate a random
 * 256-bit AES key per value, encrypt the session with AES-CTR, store the small
 * key in SecureStore (keychain-backed) and the ciphertext in AsyncStorage.
 * The tokens are therefore never at rest in plaintext, and the size limit only
 * applies to the fixed-length key.
 *
 * Web has no SecureStore; there Supabase uses AsyncStorage (localStorage),
 * which is the platform default, so this adapter is native-only.
 */
export class LargeSecureStore {
  private async encrypt(key: string, value: string): Promise<string> {
    const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8));
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));
    return aesjs.utils.hex.fromBytes(encryptedBytes);
  }

  private async decrypt(key: string, value: string): Promise<string | null> {
    const encryptionKeyHex = await SecureStore.getItemAsync(key);
    if (!encryptionKeyHex) return null;
    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(encryptionKeyHex),
      new aesjs.Counter(1),
    );
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));
    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;
    try {
      return await this.decrypt(key, encrypted);
    } catch {
      // Corrupt/rotated key — treat as no session rather than crashing auth init.
      await this.removeItem(key);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    const encrypted = await this.encrypt(key, value);
    await AsyncStorage.setItem(key, encrypted);
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  }
}

/**
 * The storage adapter Supabase should use for session persistence.
 * Native → encrypted keychain-backed store; Web → AsyncStorage (localStorage).
 */
export const sessionStorageAdapter =
  Platform.OS === 'web' ? AsyncStorage : new LargeSecureStore();
