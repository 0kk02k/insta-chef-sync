import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { cookieStorage } from '@/hooks/useCookieConsent';

const SUPABASE_URL = "https://fozagrcmptfnbnpivdnz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvemFncmNtcHRmbmJucGl2ZG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNDMwNzUsImV4cCI6MjA3MjYxOTA3NX0.bvRvt1LlleKADqQwNyLxuCLNgO7P3s7HoUFYsLSzot0";

// Custom storage that respects cookie consent
const createConsentAwareStorage = () => ({
  getItem: (key: string) => {
    // Auth tokens are necessary for functionality
    return cookieStorage.getItem(key, 'necessary');
  },
  setItem: (key: string, value: string) => {
    // Auth tokens are necessary for functionality
    cookieStorage.setItem(key, value, 'necessary');
  },
  removeItem: (key: string) => {
    cookieStorage.removeItem(key);
  },
});

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: createConsentAwareStorage(),
    persistSession: true,
    autoRefreshToken: true,
  }
});