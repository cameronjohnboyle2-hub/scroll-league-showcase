import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type TextInputProps,
  type ViewStyle
} from 'react-native';
import { colors, font, radius, shadow, spacing } from '../theme';

export function Card({ children, style, accent }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; accent?: string }>) {
  return (
    <View style={[styles.card, accent ? { borderTopColor: accent, borderTopWidth: 3 } : null, style]}>{children}</View>
  );
}

export function Eyebrow({ children, color = colors.lime }: PropsWithChildren<{ color?: string }>) {
  return <Text style={[styles.eyebrow, { color }]}>{children}</Text>;
}

export function H1({ children }: PropsWithChildren) {
  return <Text style={styles.h1}>{children}</Text>;
}

export function H2({ children }: PropsWithChildren) {
  return <Text style={styles.h2}>{children}</Text>;
}

export function Body({ children, muted = false, style }: PropsWithChildren<{ muted?: boolean; style?: StyleProp<TextStyle> }>) {
  return <Text style={[styles.body, muted && styles.muted, style]}>{children}</Text>;
}

export function Pill({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: 'neutral' | 'lime' | 'cyan' | 'orange' | 'red' }>) {
  const palette = {
    neutral: [colors.surfaceTint, colors.muted],
    lime: [colors.limeDark, colors.lime],
    cyan: ['#102F3A', colors.cyan],
    orange: ['#392414', colors.orange],
    red: ['#3B171B', colors.red]
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: palette[0] }]}>
      <Text style={[styles.pillText, { color: palette[1] }]}>{children}</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  compact = false
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        compact && styles.buttonCompact,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed
      ]}
    >
      {loading ? <ActivityIndicator color={variant === 'primary' ? colors.black : colors.text} /> : <Text style={[styles.buttonText, styles[`buttonText_${variant}`]]}>{label}</Text>}
    </Pressable>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        {...props}
        style={[styles.field, props.multiline && styles.fieldMultiline, props.style]}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Avatar({ name, url, size = 42, active = false }: { name: string; url?: string | null; size?: number; active?: boolean }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }, active && styles.avatarActive]}>
      {url ? <Image source={{ uri: url }} style={{ width: '100%', height: '100%', borderRadius: size / 2 }} accessibilityLabel={`${name} avatar`} /> : <Text style={[styles.avatarText, { fontSize: size * 0.34 }]}>{initials}</Text>}
    </View>
  );
}

export function Stat({ label, value, detail, align = 'left' }: { label: string; value: string | number; detail?: string; align?: 'left' | 'center' | 'right' }) {
  return (
    <View style={{ alignItems: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center' }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {detail ? <Text style={styles.statDetail}>{detail}</Text> : null}
    </View>
  );
}

export function ScoreBadge({ score, label = 'PTS', size = 'large' }: { score: number; label?: string; size?: 'small' | 'large' }) {
  return (
    <View style={[styles.scoreBadge, size === 'small' && styles.scoreBadgeSmall]}>
      <Text style={[styles.score, size === 'small' && styles.scoreSmall]}>{Math.round(score)}</Text>
      <Text style={styles.scoreLabel}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ value, max = 150, color = colors.lime }: { value: number; max?: number; color?: string }) {
  const width = `${Math.min(100, Math.max(0, (value / max) * 100))}%` as `${number}%`;
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width, backgroundColor: color }]} />
    </View>
  );
}

export function InlineNotice({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: 'neutral' | 'warning' | 'danger' }>) {
  const color = tone === 'danger' ? colors.red : tone === 'warning' ? colors.orange : colors.cyan;
  return (
    <View style={[styles.notice, { borderColor: color }]}>
      <Text style={[styles.noticeText, { color }]}>{children}</Text>
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <H2>{title}</H2>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, ...shadow },
  eyebrow: { fontFamily: font.data, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' },
  h1: { color: colors.text, fontFamily: font.display, fontSize: 38, letterSpacing: -0.8, lineHeight: 40 },
  h2: { color: colors.text, fontFamily: font.display, fontSize: 23, letterSpacing: -0.2, lineHeight: 26 },
  body: { color: colors.text, fontFamily: font.body, fontSize: 15, lineHeight: 22 },
  muted: { color: colors.muted },
  pill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { fontFamily: font.data, fontSize: 10, letterSpacing: 0.7, textTransform: 'uppercase' },
  button: { minHeight: 48, borderRadius: radius.md, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  buttonCompact: { minHeight: 38, paddingHorizontal: spacing.md },
  button_primary: { backgroundColor: colors.lime, borderColor: colors.lime },
  button_secondary: { backgroundColor: colors.surfaceTint, borderColor: colors.line },
  button_ghost: { backgroundColor: 'transparent', borderColor: colors.line },
  button_danger: { backgroundColor: '#3B171B', borderColor: colors.red },
  buttonText: { fontFamily: font.bodyBold, fontSize: 14 },
  buttonText_primary: { color: colors.black },
  buttonText_secondary: { color: colors.text },
  buttonText_ghost: { color: colors.muted },
  buttonText_danger: { color: colors.red },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  fieldWrap: { gap: spacing.sm },
  label: { color: colors.text, fontFamily: font.bodyBold, fontSize: 13 },
  field: { minHeight: 48, backgroundColor: colors.background, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, color: colors.text, fontFamily: font.body, fontSize: 16, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  fieldMultiline: { minHeight: 96, textAlignVertical: 'top' },
  hint: { color: colors.muted, fontFamily: font.body, fontSize: 12, lineHeight: 17 },
  avatar: { backgroundColor: colors.surfaceTint, borderColor: colors.line, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarActive: { borderColor: colors.lime, borderWidth: 2 },
  avatarText: { color: colors.text, fontFamily: font.display },
  statLabel: { color: colors.muted, fontFamily: font.data, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
  statValue: { color: colors.text, fontFamily: font.display, fontSize: 30, lineHeight: 32, fontVariant: ['tabular-nums'] },
  statDetail: { color: colors.muted, fontFamily: font.body, fontSize: 11 },
  scoreBadge: { width: 86, height: 86, borderRadius: 43, backgroundColor: colors.limeDark, borderColor: colors.lime, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  scoreBadgeSmall: { width: 58, height: 58, borderRadius: 29 },
  score: { color: colors.lime, fontFamily: font.display, fontSize: 32, lineHeight: 32, fontVariant: ['tabular-nums'] },
  scoreSmall: { fontSize: 19, lineHeight: 21 },
  scoreLabel: { color: colors.lime, fontFamily: font.data, fontSize: 8, letterSpacing: 1 },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: colors.surfaceTint, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  notice: { borderLeftWidth: 3, backgroundColor: colors.surfaceRaised, borderRadius: radius.sm, padding: spacing.md },
  noticeText: { fontFamily: font.bodySemibold, fontSize: 13, lineHeight: 19 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }
});
