import { SymbolView } from 'expo-symbols';
import { Pressable, useColorScheme } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { setColorScheme } from '@/services/theme/color-scheme';

/** Bouton soleil/lune : bascule entre mode clair et mode sombre. */
export function ThemeToggle() {
  const isDark = useColorScheme() === 'dark';
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => setColorScheme(isDark ? 'light' : 'dark')}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}>
      <SymbolView
        name={
          isDark
            ? { ios: 'sun.max.fill', android: 'light_mode' }
            : { ios: 'moon.fill', android: 'dark_mode' }
        }
        size={22}
        tintColor={theme.text}
      />
    </Pressable>
  );
}
