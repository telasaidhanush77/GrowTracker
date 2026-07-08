import '@testing-library/jest-native/extend-expect';
import { notifyManager, timeoutManager } from '@tanstack/react-query';

// Provide stub Supabase env vars so supabase.ts doesn't throw at import time.
// All Supabase calls in tests are mocked via jest.mock('../../lib/supabase').
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';

// TanStack Query v5 batches state-change notifications via setTimeout by default.
// Switching to synchronous dispatch eliminates the notification batch timer.
notifyManager.setScheduler(notify => notify());

// TanStack Query's GC timers (gcTime, staleTime) use the timeoutManager which
// holds Node.js Timeout objects. By default these keep the Jest worker alive
// after tests finish. Calling .unref() on each timer lets Node exit immediately
// once all sync/async test work is done, without cancelling the timers themselves.
timeoutManager.setTimeoutProvider({
  setTimeout: (cb, delay) => {
    const id = setTimeout(cb, delay);
    if (typeof id === 'object' && 'unref' in id) (id as NodeJS.Timeout).unref();
    return id as unknown as number;
  },
  clearTimeout: (id) => clearTimeout(id as unknown as NodeJS.Timeout),
  setInterval: (cb, delay) => {
    const id = setInterval(cb, delay);
    if (typeof id === 'object' && 'unref' in id) (id as NodeJS.Timeout).unref();
    return id as unknown as number;
  },
  clearInterval: (id) => clearInterval(id as unknown as NodeJS.Timeout),
});
