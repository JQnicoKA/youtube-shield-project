import type { User } from '@react-native-google-signin/google-signin';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import * as auth from '@/services/auth/google-auth';
import { youtube, type Channel } from '@/services/youtube';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  channel: Channel | null;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Une fois connecté à Google, on vérifie que le compte possède bien une chaîne YouTube. */
  const finishSignIn = useCallback(async (u: User) => {
    const ch = await youtube.getMyChannel();
    if (!ch) {
      await auth.signOut();
      throw new Error("Ce compte Google n'a pas de chaîne YouTube.");
    }
    setUser(u);
    setChannel(ch);
    setStatus('signedIn');
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const u = await auth.restoreSession();
        if (u) await finishSignIn(u);
        else setStatus('signedOut');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setStatus('signedOut');
      }
    })();
  }, [finishSignIn]);

  const signIn = useCallback(async () => {
    setError(null);
    try {
      const u = await auth.signIn();
      if (u) await finishSignIn(u);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [finishSignIn]);

  const signOut = useCallback(async () => {
    await auth.signOut();
    queryClient.clear();
    setUser(null);
    setChannel(null);
    setStatus('signedOut');
  }, [queryClient]);

  const value = useMemo(
    () => ({ status, user, channel, error, signIn, signOut }),
    [status, user, channel, error, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
