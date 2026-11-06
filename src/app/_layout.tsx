import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { restoreColorScheme } from '@/services/theme/color-scheme';
import { YouTubeApiError } from '@/services/youtube';

SplashScreen.preventAutoHideAsync();
// Lancé pendant le splash screen (qui attend la session Google) : pas de flash de mauvais thème.
restoreColorScheme();

/** Thèmes de navigation (en-tête, fond des écrans) alignés sur notre palette. */
const navThemes = {
  light: {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: Colors.light.background, card: Colors.light.background },
  },
  dark: {
    ...DarkTheme,
    colors: { ...DarkTheme.colors, background: Colors.dark.background, card: Colors.dark.background },
  },
};

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Inutile de réessayer quand le quota est épuisé ou la session invalide.
        retry: (count, error) =>
          !(error instanceof YouTubeApiError && ['quota', 'auth', 'forbidden'].includes(error.kind)) &&
          count < 2,
      },
    },
  });
}

function HideSplashWhenReady() {
  const { status } = useAuth();
  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync();
  }, [status]);
  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? navThemes.dark : navThemes.light}>
          <HideSplashWhenReady />
          <Stack>
            <Stack.Screen name="index" options={{ title: 'Commentaires' }} />
          </Stack>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
