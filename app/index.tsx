import { Link, Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/auth/AuthProvider';
import { Button, Card, Eyebrow, H1, Pill } from '../src/components/ui';
import { colors, font, spacing } from '../src/theme';
import { isPortfolioDemo } from '../src/config/runtime';
import { getDemoSnapshot } from '../src/demo/fixtures';

export default function LandingRoute() {
  const auth = useAuth();
  const { width } = useWindowDimensions();
  const preview = getDemoSnapshot();
  if (auth.loading) return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.lime} size="large" /></SafeAreaView>;
  if (auth.session) return <Redirect href="/home" />;
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topbar}><Text style={styles.brand}>SCROLL<Text style={{ color: colors.lime }}>/</Text>LEAGUE</Text><Pill>{isPortfolioDemo ? 'Fictional demo' : 'Private beta'}</Pill></View>
      <View style={[styles.hero, width >= 800 && styles.heroWide]}>
        <View style={styles.copy}>
          <Eyebrow>Less scroll. More scoreboard.</Eyebrow>
          <H1>Screen time gets competitive.</H1>
          <Text style={styles.lede}>A private eight-week league for friends who want fewer accidental hours and more reasons to show up.</Text>
          <View style={styles.actions}>
            {!isPortfolioDemo ? <Link href="/onboarding" asChild><Button label={auth.configured ? 'Create or join a league' : 'See setup'} /></Link> : null}
            <Link href="/demo" asChild><Button label="Explore fictional league" variant={isPortfolioDemo ? 'primary' : 'secondary'} /></Link>
          </View>
        </View>
        <Card accent={colors.lime} style={styles.scorecard}>
          <View style={styles.weekRow}><Eyebrow>Season standings · Example</Eyebrow><Pill tone="lime">Daybreak Demo</Pill></View>
          {[...preview.members].sort((a, b) => a.rank - b.rank).map((item) => <View key={item.id} style={styles.rankRow}><Text style={styles.rank}>{item.rank}</Text><Text style={styles.name}>{item.displayName}</Text><Text style={styles.record}>{item.record}</Text><Text style={styles.points}>{item.score}</Text></View>)}
          <View style={styles.stake}><Eyebrow color={colors.orange}>Last-place stake</Eyebrow><Text style={styles.stakeText}>Flip-phone wallpaper for a week.</Text></View>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  topbar: { height: 68, paddingHorizontal: spacing.xl, borderBottomColor: colors.line, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: colors.text, fontFamily: font.display, fontSize: 20, letterSpacing: 0.3 },
  hero: { flex: 1, maxWidth: 1120, width: '100%', alignSelf: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.xxl },
  heroWide: { flexDirection: 'row', alignItems: 'center' },
  copy: { flex: 1, gap: spacing.lg },
  lede: { color: colors.muted, fontFamily: font.body, fontSize: 19, lineHeight: 29, maxWidth: 560 },
  actions: { gap: spacing.md, maxWidth: 360 },
  scorecard: { flex: 1, maxWidth: 480, minWidth: 300 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  rankRow: { flexDirection: 'row', alignItems: 'center', minHeight: 50, borderBottomColor: colors.line, borderBottomWidth: 1 },
  rank: { width: 34, color: colors.lime, fontFamily: font.display, fontSize: 22, fontVariant: ['tabular-nums'] },
  name: { flex: 1, color: colors.text, fontFamily: font.bodyBold },
  record: { width: 52, color: colors.muted, fontFamily: font.data, fontVariant: ['tabular-nums'] },
  points: { width: 44, textAlign: 'right', color: colors.text, fontFamily: font.display, fontSize: 22, fontVariant: ['tabular-nums'] },
  stake: { marginTop: spacing.md, backgroundColor: '#392414', borderRadius: 14, padding: spacing.md, gap: spacing.xs },
  stakeText: { color: colors.text, fontFamily: font.bodyBold, fontSize: 15 }
});
