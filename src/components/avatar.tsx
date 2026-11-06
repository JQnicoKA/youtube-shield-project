import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type Props = { uri?: string; name: string; size?: number };

export function Avatar({ uri, name, size = 40 }: Props) {
  const theme = useTheme();
  const style = { width: size, height: size, borderRadius: size / 2 };

  if (!uri) {
    return (
      <View style={[styles.fallback, style, { backgroundColor: theme.backgroundSelected }]}>
        <ThemedText type="smallBold">{name.replace(/^@/, '').charAt(0).toUpperCase()}</ThemedText>
      </View>
    );
  }
  return <Image source={{ uri }} style={style} contentFit="cover" transition={150} />;
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
