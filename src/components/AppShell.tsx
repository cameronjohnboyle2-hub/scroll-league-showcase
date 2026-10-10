import { Link, usePathname } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, spacing } from '../theme';
import { Pill } from './ui';

const nav = [
  { href: '/home', label: 'Home', glyph: '⌂' },
  { href: '/league', label: 'League', glyph: '▥' },
  { href: '/entry', label: 'Entry', glyph: '+' },
  { href: '/consequences', label: 'Stakes', glyph: '!' },
  { href: '/profile', label: 'Profile', glyph: '●' }
] as const;

export function AppShell({ children, demo = false }: PropsWithChildren<{ demo?: boolean }>) {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const query = demo ? '?demo=1' : '';

  const navigation = (
    <View style={[styles.nav, desktop ? styles.navDesktop : styles.navMobile]}>
      {nav.map((item) => {
        const active = pathname === item.href || (pathname === '/demo' && item.href === '/home');
        return (
          <Link key={item.href} href={`${item.href}${query}` as never} asChild>
            <Pressable style={StyleSheet.flatten([styles.navLink, active ? styles.navLinkActive : undefined])}>
              <Text style={[styles.navGlyph, active && styles.navTextActive]}>{item.glyph}</Text>
              <Text style={[styles.navText, active && styles.navTextActive]}>{item.label}</Text>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.root}>
        {desktop ? navigation : null}
        <View style={styles.main}>
          <View style={styles.topbar}>
            <Link href={demo ? '/demo' : '/home'} style={styles.brand}>
              SCROLL<Text style={{ color: colors.lime }}>/</Text>LEAGUE
            </Link>
            {demo ? <Pill tone="lime">Fictional demo</Pill> : <Pill>Private league</Pill>}
          </View>
          <ScrollView contentContainerStyle={[styles.content, desktop && styles.contentDesktop]} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          {!desktop ? navigation : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  root: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
  main: { flex: 1 },
  topbar: { height: 62, borderBottomColor: colors.line, borderBottomWidth: 1, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: colors.text, fontFamily: font.display, fontSize: 20, letterSpacing: 0.3 },
  content: { width: '100%', maxWidth: 1080, alignSelf: 'center', padding: spacing.lg, paddingBottom: 108, gap: spacing.lg },
  contentDesktop: { paddingHorizontal: spacing.xxl, paddingVertical: spacing.xxl },
  nav: { backgroundColor: colors.surface, borderColor: colors.line },
  navDesktop: { width: 112, borderRightWidth: 1, paddingVertical: spacing.xl, gap: spacing.sm },
  navMobile: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 74, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingBottom: spacing.sm },
  navLink: { color: colors.muted, textDecorationLine: 'none', alignItems: 'center', justifyContent: 'center', textAlign: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.sm, minWidth: 68, borderRadius: radius.md },
  navLinkActive: { backgroundColor: colors.limeDark },
  navGlyph: { color: colors.muted, fontFamily: font.display, fontSize: 22, textAlign: 'center' },
  navText: { color: colors.muted, fontFamily: font.bodyBold, fontSize: 10, marginTop: 3, textAlign: 'center' },
  navTextActive: { color: colors.lime }
});
