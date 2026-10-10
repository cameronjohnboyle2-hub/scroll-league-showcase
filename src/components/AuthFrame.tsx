import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, spacing } from '../theme';

export function AuthFrame({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topbar}><Text style={styles.brand}>SCROLL<Text style={{ color: colors.lime }}>/</Text>LEAGUE</Text></View>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topbar: { height: 64, borderBottomColor: colors.line, borderBottomWidth: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
  brand: { color: colors.text, fontFamily: font.display, fontSize: 20, letterSpacing: 0.3 },
  content: { flex: 1, width: '100%', maxWidth: 620, alignSelf: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.lg }
});
