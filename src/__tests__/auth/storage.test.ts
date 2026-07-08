import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  userStore,
  sessionStore,
  counterStore,
  otpStore,
  goalStore,
  notifStore,
  logStore,
} from '../../auth/storage';

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
});

describe('userStore', () => {
  it('getAll returns empty array when storage is empty', async () => {
    expect(await userStore.getAll()).toEqual([]);
  });

  it('getAll returns parsed users from storage', async () => {
    const users = [{ id: 'u1', name: 'Alice' }];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(users));
    expect(await userStore.getAll()).toEqual(users);
  });

  it('getAll returns fallback on corrupt JSON', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('not-json{');
    expect(await userStore.getAll()).toEqual([]);
  });

  it('save calls setItem with serialized users', async () => {
    const users = [{ id: 'u1', name: 'Bob' }] as any;
    await userStore.save(users);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@gt:users', JSON.stringify(users));
  });
});

describe('sessionStore', () => {
  it('get returns null when nothing stored', async () => {
    expect(await sessionStore.get()).toBeNull();
  });

  it('get returns parsed session', async () => {
    const session = { userId: 'u1', role: 'employee', createdAt: '2026-01-01T00:00:00Z' };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(session));
    expect(await sessionStore.get()).toEqual(session);
  });

  it('save(session) calls setItem', async () => {
    const session = { userId: 'u1', role: 'employee', createdAt: '2026-01-01T00:00:00Z' } as any;
    await sessionStore.save(session);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@gt:session', JSON.stringify(session));
  });

  it('save(null) calls removeItem instead of setItem', async () => {
    await sessionStore.save(null);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@gt:session');
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});

describe('counterStore', () => {
  it('get returns default counters when nothing stored', async () => {
    expect(await counterStore.get()).toEqual({ admin: 0, manager: 0, employee: 0 });
  });

  it('get returns parsed counters', async () => {
    const counters = { admin: 1, manager: 2, employee: 5 };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(counters));
    expect(await counterStore.get()).toEqual(counters);
  });

  it('save calls setItem with serialized counters', async () => {
    const counters = { admin: 1, manager: 1, employee: 10 };
    await counterStore.save(counters);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@gt:counters', JSON.stringify(counters));
  });
});

describe('otpStore', () => {
  it('getAll returns empty array by default', async () => {
    expect(await otpStore.getAll()).toEqual([]);
  });

  it('getAll returns parsed OTP records', async () => {
    const otps = [{ email: 'a@b.com', otp: '123456', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2026-01-01T00:10:00Z' }];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(otps));
    expect(await otpStore.getAll()).toEqual(otps);
  });

  it('save serializes and stores OTP records', async () => {
    const otps = [{ email: 'a@b.com', otp: '654321', createdAt: 'now', expiresAt: 'later' }];
    await otpStore.save(otps);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@gt:otps', JSON.stringify(otps));
  });
});

describe('goalStore', () => {
  it('getAll returns empty array by default', async () => {
    expect(await goalStore.getAll()).toEqual([]);
  });

  it('getAll returns parsed goals', async () => {
    const goals = [{ id: 'g1', title: 'Goal 1' }];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(goals));
    expect(await goalStore.getAll()).toEqual(goals);
  });

  it('save serializes and stores goals', async () => {
    const goals = [{ id: 'g1', title: 'Goal 1' }] as any;
    await goalStore.save(goals);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@gt:goals', JSON.stringify(goals));
  });
});

describe('notifStore', () => {
  it('getAll returns empty array by default', async () => {
    expect(await notifStore.getAll()).toEqual([]);
  });

  it('getAll returns parsed notifications', async () => {
    const notifs = [{ id: 'n1', title: 'Hello' }];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(notifs));
    expect(await notifStore.getAll()).toEqual(notifs);
  });

  it('save serializes and stores notifications', async () => {
    const notifs = [{ id: 'n1', title: 'Hi' }] as any;
    await notifStore.save(notifs);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@gt:notifications', JSON.stringify(notifs));
  });
});

describe('logStore', () => {
  it('getAll returns empty array by default', async () => {
    expect(await logStore.getAll()).toEqual([]);
  });

  it('getAll returns parsed daily logs', async () => {
    const logs = [{ id: 'l1', date: '2026-01-01' }];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(logs));
    expect(await logStore.getAll()).toEqual(logs);
  });

  it('save serializes and stores daily logs', async () => {
    const logs = [{ id: 'l1', date: '2026-01-01' }] as any;
    await logStore.save(logs);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@gt:dailylogs', JSON.stringify(logs));
  });
});
