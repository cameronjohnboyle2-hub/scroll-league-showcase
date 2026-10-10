import { Link, router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { api } from '../data/api';
import { toLocalDate, formatShortDate, formatWeekday, isIsoDate } from '../domain/dates';
import { scoreWeek } from '../domain/scoring';
import type { ActiveAppSnapshot, Member, WeeklyPerformance } from '../domain/types';
import { colors, font, radius, spacing } from '../theme';
import { AppShell } from '../components/AppShell';
import { Avatar, Body, Button, Card, Eyebrow, Field, H1, H2, InlineNotice, Pill, ProgressBar, ScoreBadge, SectionHeader, Stat } from '../components/ui';

type ScreenProps = { snapshot: ActiveAppSnapshot; demo: boolean; refresh: () => Promise<void> };

function member(snapshot: ActiveAppSnapshot, userId: string | null): Member | null {
  return snapshot.members.find((item) => item.id === userId) ?? null;
}

function currentPerformance(snapshot: ActiveAppSnapshot, userId: string) {
  return performanceForWeek(snapshot, userId, snapshot.currentWeek);
}

function performanceForWeek(snapshot: ActiveAppSnapshot, userId: string, week: ActiveAppSnapshot['currentWeek']) {
  const target = snapshot.weekParticipants.find((participant) => participant.weekId === week.id && participant.userId === userId)?.targetMinutes ?? member(snapshot, userId)?.targetMinutes ?? 120;
  return scoreWeek({
    userId,
    targetMinutes: target,
    startDate: week.startDate,
    entries: snapshot.entries.filter((entry) => entry.userId === userId),
    today: toLocalDate(new Date(), snapshot.league.timezone),
    isFinal: week.status === 'finalized'
  });
}

function ScreenTitle({ eyebrow, title, detail }: { eyebrow: string; title: string; detail?: string }) {
  return (
    <View style={styles.titleBlock}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <H1>{title}</H1>
      {detail ? <Body muted>{detail}</Body> : null}
    </View>
  );
}

export function HomeScreen({ snapshot, demo, refresh }: ScreenProps) {
  const { width } = useWindowDimensions();
  const twoColumns = width >= 760;
  const me = member(snapshot, snapshot.profile.id)!;
  const performance = currentPerformance(snapshot, me.id);
  const matchup = snapshot.matchups.find((item) => item.weekNumber === snapshot.currentWeek.number && (item.memberAId === me.id || item.memberBId === me.id));
  const opponentId = matchup ? (matchup.memberAId === me.id ? matchup.memberBId : matchup.memberAId) : null;
  const opponent = member(snapshot, opponentId);
  const opponentPerformance = opponent ? currentPerformance(snapshot, opponent.id) : null;
  const today = toLocalDate(new Date(), snapshot.league.timezone);
  const todayEntry = snapshot.entries.find((entry) => entry.userId === me.id && entry.localDate === today);
  const standing = snapshot.standings.find((row) => row.userId === me.id);
  const weekIsFinal = snapshot.currentWeek.status === 'finalized';
  const eligibleThisWeek = snapshot.weekParticipants.some((participant) => participant.weekId === snapshot.currentWeek.id && participant.userId === me.id);

  return (
    <AppShell demo={demo}>
      {demo ? <InlineNotice>Read-only demo · dates and scores move with the current week.</InlineNotice> : null}
      {snapshot.season.status === 'completed' ? <Card accent={colors.lime}><Eyebrow>Season complete</Eyebrow><H2>The final standings are locked.</H2><Body muted>Review the recaps or begin another eight-week season.</Body>{snapshot.league.commissionerId === snapshot.profile.id && !demo ? <Button label="Start a new season" onPress={async () => { await api.startSeason(); await refresh(); }} /> : null}</Card> : null}
      <View style={[styles.hero, twoColumns && styles.heroWide]}>
        <View style={styles.heroCopy}>
          <Eyebrow>Week {snapshot.currentWeek.number} · Day {Math.min(7, performance.days.filter((day) => day.status !== 'future').length)}</Eyebrow>
          <H1>{snapshot.league.name}</H1>
          <Body muted>{formatShortDate(snapshot.currentWeek.startDate)}–{formatShortDate(snapshot.currentWeek.endDate)} · {snapshot.league.timezone}</Body>
        </View>
        <View style={styles.heroStats}>
          <Stat label="Rank" value={`#${standing?.rank ?? me.rank}`} detail={`of ${snapshot.members.length}`} />
          <Stat label="Record" value={me.record} />
          <Stat label="Target" value={`${me.targetMinutes}m`} detail="daily" />
        </View>
      </View>

      <View style={[styles.grid, twoColumns && styles.gridWide]}>
        <Card accent={colors.lime} style={styles.gridCard}>
          <View style={styles.rowBetween}>
            <View style={styles.gapSmall}>
              <Eyebrow>Today’s report</Eyebrow>
              <H2>{todayEntry ? `${todayEntry.minutes} minutes` : 'Not reported'}</H2>
              <Body muted>{todayEntry ? `${todayEntry.minutes - me.targetMinutes > 0 ? '+' : ''}${todayEntry.minutes - me.targetMinutes} vs target` : 'An unreported day currently scores 0.'}</Body>
            </View>
            <ScoreBadge score={performance.days.find((day) => day.localDate === today)?.roundedScore ?? 0} />
          </View>
          <Link href={`/entry${demo ? '?demo=1' : ''}` as never} asChild>
            <Button label={eligibleThisWeek ? (todayEntry ? 'Edit today’s entry' : 'Log today’s time') : `Competition starts Week ${me.eligibleFromWeek}`} disabled={!eligibleThisWeek} />
          </Link>
        </Card>

        <Card style={styles.gridCard}>
          <View style={styles.rowBetween}>
            <View style={styles.gapSmall}>
              <Eyebrow>{weekIsFinal ? 'Final weekly score' : 'Provisional pace'}</Eyebrow>
              <H2>{performance.displayedScore} pts</H2>
              <Body muted>{weekIsFinal ? 'Average across all seven days' : 'Average across elapsed days'}</Body>
            </View>
            <Pill tone={performance.displayedScore >= 100 ? 'lime' : 'orange'}>{performance.displayedScore >= 100 ? 'Above target' : 'Chasing'}</Pill>
          </View>
          <ProgressBar value={performance.displayedScore} />
          <View style={styles.daysRow}>
            {performance.days.map((day) => (
              <View key={day.localDate} style={styles.dayMini}>
                <Text style={styles.dayLabel}>{formatWeekday(day.localDate).slice(0, 1)}</Text>
                <View style={[styles.dayDot, day.status === 'reported' ? styles.dayDotReported : day.status === 'unreported' ? styles.dayDotMissing : null]} />
              </View>
            ))}
          </View>
        </Card>
      </View>

      <Card accent={colors.cyan}>
        <View style={styles.rowBetween}>
          <View style={styles.gapSmall}>
            <Eyebrow color={colors.cyan}>Head-to-head</Eyebrow>
            <H2>{opponent ? `You vs ${opponent.displayName}` : eligibleThisWeek ? 'Bye week' : `You enter in Week ${me.eligibleFromWeek}`}</H2>
            <Body muted>{opponent ? 'Live pace · final result locks after day 7' : eligibleThisWeek ? 'No win or loss, but overall last place still applies.' : 'Members who join during a week start competing the following week.'}</Body>
          </View>
            <Pill tone="cyan">{weekIsFinal ? 'Final' : 'Live'}</Pill>
        </View>
        {opponent && opponentPerformance ? (
          <View style={styles.versus}>
            <View style={styles.playerScore}>
              <Avatar name={me.displayName} url={me.avatarUrl} active />
              <Text style={styles.playerName}>You</Text>
              <Text style={styles.bigScore}>{performance.displayedScore}</Text>
              <Text style={styles.rawMinutes}>{performance.days.reduce((sum, day) => sum + (day.minutes ?? 0), 0)} min</Text>
            </View>
            <Text style={styles.vs}>VS</Text>
            <View style={styles.playerScore}>
              <Avatar name={opponent.displayName} url={opponent.avatarUrl} />
              <Text style={styles.playerName}>{opponent.displayName}</Text>
              <Text style={styles.bigScore}>{opponentPerformance.displayedScore}</Text>
              <Text style={styles.rawMinutes}>{opponentPerformance.days.reduce((sum, day) => sum + (day.minutes ?? 0), 0)} min</Text>
            </View>
          </View>
        ) : null}
        <Link href={`/matchup${demo ? '?demo=1' : ''}` as never} asChild><Button label="Open matchup" variant="secondary" /></Link>
      </Card>

      {snapshot.currentWeek.stake ? (
        <Card accent={colors.orange}>
          <View style={styles.rowBetween}>
            <View style={styles.gapSmall}>
              <Eyebrow color={colors.orange}>This week’s stake</Eyebrow>
              <H2>{snapshot.currentWeek.stake.title}</H2>
              <Body muted>{snapshot.currentWeek.stake.description ?? 'Selected before the week. Honor system.'}</Body>
            </View>
            <Text style={styles.stakeGlyph}>!</Text>
          </View>
        </Card>
      ) : null}

      <SectionHeader title="League activity" />
      <Card>
        {snapshot.activity.map((event, index) => (
          <View key={event.id} style={[styles.activityRow, index < snapshot.activity.length - 1 && styles.withDivider]}>
            <View style={[styles.activityDot, { backgroundColor: event.type === 'entry' ? colors.lime : event.type === 'result' ? colors.cyan : colors.orange }]} />
            <View style={styles.flex}>
              <Body>{event.text}</Body>
              <Text style={styles.timestamp}>{new Date(event.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</Text>
            </View>
          </View>
        ))}
      </Card>
    </AppShell>
  );
}

export function LeagueScreen({ snapshot, demo }: ScreenProps) {
  async function shareInvite() {
    if (!snapshot.league.inviteCode) return;
    const url = Linking.createURL('/join', { queryParams: { code: snapshot.league.inviteCode } });
    await Share.share({ title: `Join ${snapshot.league.name}`, message: `Join ${snapshot.league.name} on Scroll League: ${url}`, url });
  }
  return (
    <AppShell demo={demo}>
      <ScreenTitle eyebrow={`Season ${snapshot.season.number}`} title={snapshot.league.name} detail={`${snapshot.members.length} members · ${snapshot.league.timezone}`} />
      <Card>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, styles.rankCell]}>#</Text><Text style={[styles.tableCell, styles.memberCell]}>Member</Text><Text style={styles.tableCell}>Record</Text><Text style={styles.tableCell}>Score</Text>
        </View>
        {snapshot.standings.map((standing, index) => {
          const item = member(snapshot, standing.userId)!;
          return (
            <View key={standing.userId} style={[styles.tableRow, index < snapshot.standings.length - 1 && styles.withDivider]}>
              <Text style={[styles.rankNumber, styles.rankCell]}>{standing.rank}</Text>
              <View style={[styles.memberCell, styles.memberIdentity]}><Avatar name={item.displayName} url={item.avatarUrl} size={36} active={item.id === snapshot.profile.id} /><View><Text style={styles.memberName}>{item.displayName}</Text><Text style={styles.memberTarget}>{item.targetMinutes}m target</Text></View></View>
              <Text style={styles.tableValue}>{standing.wins}-{standing.losses}{standing.ties ? `-${standing.ties}` : ''}</Text>
              <Text style={styles.tableValue}>{standing.totalScore.toFixed(0)}</Text>
            </View>
          );
        })}
      </Card>

      <SectionHeader title="Roster" />
      <View style={styles.cardList}>
        {snapshot.members.map((item) => (
          <Card key={item.id}>
            <View style={styles.rowBetween}>
              <View style={styles.memberIdentity}><Avatar name={item.displayName} url={item.avatarUrl} size={44} /><View><H2>{item.displayName}</H2><Body muted>{item.isCommissioner ? 'Commissioner · ' : ''}{item.targetMinutes} min target{item.nextTargetMinutes ? ` · ${item.nextTargetMinutes} next week` : ''}</Body></View></View>
              <Pill>{item.record}</Pill>
            </View>
          </Card>
        ))}
      </View>
      <SectionHeader title="Season weeks" />
      <View style={styles.cardList}>
        {snapshot.weeks.map((week) => (
          <Card key={week.id}>
            <View style={styles.rowBetween}>
              <View><Eyebrow>Week {week.number}</Eyebrow><Body muted>{formatShortDate(week.startDate)}–{formatShortDate(week.endDate)}</Body></View>
              <Pill tone={week.status === 'finalized' ? 'lime' : week.status === 'active' ? 'cyan' : 'neutral'}>{week.status}</Pill>
            </View>
            {week.recap ? <Link href={`/recap?week=${week.number}${demo ? '&demo=1' : ''}` as never} asChild><Button label="Open recap" variant="secondary" compact /></Link> : <Link href={`/matchup?week=${week.number}${demo ? '&demo=1' : ''}` as never} asChild><Button label="Open matchups" variant="ghost" compact /></Link>}
          </Card>
        ))}
      </View>
      <Card>
        <Eyebrow>League rules</Eyebrow>
        <Body>{snapshot.league.consequenceRules}</Body>
        {snapshot.league.inviteCode ? <InlineNotice>Invite code: {snapshot.league.inviteCode}</InlineNotice> : null}
        {!demo && snapshot.league.inviteCode ? <Button label="Share invite link" variant="secondary" onPress={() => void shareInvite()} /> : null}
      </Card>
    </AppShell>
  );
}

export function MatchupScreen({ snapshot, demo, weekNumber }: ScreenProps & { weekNumber?: number }) {
  const me = member(snapshot, snapshot.profile.id)!;
  const week = snapshot.weeks.find((item) => item.number === weekNumber) ?? snapshot.currentWeek;
  const matchup = snapshot.matchups.find((item) => item.weekNumber === week.number && (item.memberAId === me.id || item.memberBId === me.id));
  const opponent = member(snapshot, matchup?.memberAId === me.id ? matchup.memberBId : matchup?.memberAId ?? null);
  const mine = performanceForWeek(snapshot, me.id, week);
  const theirs = opponent ? performanceForWeek(snapshot, opponent.id, week) : null;
  const eligibleThisWeek = snapshot.weekParticipants.some((participant) => participant.weekId === week.id && participant.userId === me.id);
  if (!eligibleThisWeek) {
    return (
      <AppShell demo={demo}>
        <ScreenTitle eyebrow={`Week ${week.number} matchup`} title={`${me.displayName} was not yet eligible`} detail="Members who join during a week enter competition with the following weekly snapshot." />
        <InlineNotice>No score, win, loss, bye, or last-place eligibility was recorded for this week.</InlineNotice>
      </AppShell>
    );
  }
  const finalResult = matchup?.status === 'final'
    ? matchup.isTie
      ? 'Exact tie'
      : matchup.winnerId === me.id
        ? `${me.displayName} won`
        : opponent
          ? `${opponent.displayName} won`
          : 'Bye week'
    : 'Live pace';
  return (
    <AppShell demo={demo}>
      <ScreenTitle eyebrow={`Week ${week.number} matchup`} title={opponent ? `${me.displayName} vs ${opponent.displayName}` : `${me.displayName} has a bye`} detail="Daily scores use each member’s snapshotted target." />
      <Card accent={colors.cyan}>
        <View style={styles.versus}>
          <View style={styles.playerScore}><Avatar name={me.displayName} url={me.avatarUrl} size={52} active /><Text style={styles.playerName}>{me.displayName}</Text><Text style={styles.megaScore}>{mine.displayedScore}</Text><Text style={styles.rawMinutes}>{mine.days.reduce((sum, day) => sum + (day.minutes ?? 0), 0)} min · {week.status === 'finalized' ? 'final' : 'pace'}</Text></View>
          <Text style={styles.vs}>VS</Text>
          {opponent && theirs ? <View style={styles.playerScore}><Avatar name={opponent.displayName} url={opponent.avatarUrl} size={52} /><Text style={styles.playerName}>{opponent.displayName}</Text><Text style={styles.megaScore}>{theirs.displayedScore}</Text><Text style={styles.rawMinutes}>{theirs.days.reduce((sum, day) => sum + (day.minutes ?? 0), 0)} min · {week.status === 'finalized' ? 'final' : 'pace'}</Text></View> : <View style={styles.playerScore}><Text style={styles.megaScore}>—</Text><Text style={styles.rawMinutes}>bye</Text></View>}
        </View>
        <Pill tone={matchup?.status === 'final' ? 'lime' : 'cyan'}>{finalResult}</Pill>
      </Card>
      {opponent && theirs ? (
        <View style={styles.cardList}>
          <Card>
            <View style={styles.dailyHeader}><Text style={[styles.dailyText, styles.dailyDay]}>Day</Text><Text style={styles.dailyText}>{me.displayName}</Text><Text style={styles.dailyText}>{opponent.displayName}</Text></View>
            {mine.days.map((day, index) => {
              const other = theirs.days[index]!;
              return (
                <View key={day.localDate} style={[styles.dailyRow, index < 6 && styles.withDivider]}>
                  <View style={styles.dailyDay}><Text style={styles.memberName}>{formatWeekday(day.localDate)}</Text><Text style={styles.memberTarget}>{formatShortDate(day.localDate)}</Text></View>
                  <DayResult day={day} />
                  <DayResult day={other} />
                </View>
              );
            })}
          </Card>
          <Card>
            <Eyebrow>Rolling score trend</Eyebrow>
            <TrendLine label={me.displayName} performance={mine} color={colors.lime} />
            <TrendLine label={opponent.displayName} performance={theirs} color={colors.cyan} />
          </Card>
        </View>
      ) : <InlineNotice>A bye gives neither a win nor a loss. Your weekly score still counts toward overall last place.</InlineNotice>}
      <Card>
        <Eyebrow>How the score works</Eyebrow>
        <Body muted>Meet your personal target for 100. Half your target earns 150. Twice your target earns 0. An elapsed unreported day is visibly missing and scores 0.</Body>
      </Card>
    </AppShell>
  );
}

function DayResult({ day }: { day: ReturnType<typeof currentPerformance>['days'][number] }) {
  const color = day.status === 'reported' ? (day.roundedScore >= 100 ? colors.lime : colors.orange) : day.status === 'future' ? colors.muted : colors.red;
  return (
    <View style={styles.dailyResult}>
      <Text style={[styles.dailyScore, { color }]}>{day.status === 'future' ? '—' : day.roundedScore}</Text>
      <Text style={styles.rawMinutes}>{day.status === 'reported' ? `${day.minutes} min` : day.status}</Text>
    </View>
  );
}

function TrendLine({ label, performance, color }: { label: string; performance: WeeklyPerformance; color: string }) {
  const elapsedDays = performance.days.filter((day) => day.status !== 'future');
  const elapsed = elapsedDays.map((day, index) => ({
    day,
    pace: Math.round(elapsedDays.slice(0, index + 1).reduce((sum, item) => sum + item.roundedScore, 0) / (index + 1))
  }));
  return (
    <View style={styles.trendBlock}>
      <Text style={styles.memberName}>{label}</Text>
      <View style={styles.trendRow}>
        {elapsed.map(({ day, pace }) => <View key={day.localDate} style={styles.trendPoint}><Text style={styles.dayLabel}>{formatWeekday(day.localDate).slice(0, 1)}</Text><Text style={[styles.trendValue, { color }]}>{pace}</Text></View>)}
      </View>
    </View>
  );
}

export function EntryScreen({ snapshot, demo, refresh, initialDate }: ScreenProps & { initialDate?: string }) {
  const today = toLocalDate(new Date(), snapshot.league.timezone);
  const startingDate = initialDate && isIsoDate(initialDate) ? initialDate : today;
  const current = snapshot.entries.find((entry) => entry.userId === snapshot.profile.id && entry.localDate === startingDate);
  const [minutes, setMinutes] = useState(current?.minutes.toString() ?? '');
  const [date, setDate] = useState(startingDate);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const seasonClosed = snapshot.season.status === 'completed';
  const eligibleThisWeek = snapshot.weekParticipants.some((participant) => participant.weekId === snapshot.currentWeek.id && participant.userId === snapshot.profile.id);
  const numeric = Number(minutes);
  const validDate = isIsoDate(date);
  const valid = minutes.trim().length > 0 && Number.isInteger(numeric) && numeric >= 0 && numeric <= 1440 && validDate;
  const entryWeek = snapshot.weeks.find((week) => date >= week.startDate && date <= week.endDate);
  const target = snapshot.weekParticipants.find((p) => p.weekId === entryWeek?.id && p.userId === snapshot.profile.id)?.targetMinutes ?? member(snapshot, snapshot.profile.id)!.targetMinutes;
  const preview = valid ? scoreWeek({ userId: snapshot.profile.id, targetMinutes: target, startDate: date, entries: [{ userId: snapshot.profile.id, localDate: date, minutes: numeric, source: 'manual', evidenceRef: null }], today: date, isFinal: false }).days[0] : null;
  async function save() {
    if (!valid) return;
    if (demo) { setMessage('Demo entries are read-only. Your score preview is live above.'); return; }
    setSaving(true); setMessage(null);
    try { await api.submitEntry(date, numeric); await refresh(); setMessage('Entry saved.'); }
    catch (caught) { setMessage(caught instanceof Error ? caught.message : 'Could not save the entry.'); }
    finally { setSaving(false); }
  }
  return (
    <AppShell demo={demo}>
      <ScreenTitle eyebrow="Fast entry" title="How much did you scroll?" detail={`Recreational time only · ${snapshot.league.timezone}`} />
      <Card accent={colors.lime}>
        <Field label="Local date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />
        <Field label="Minutes" value={minutes} onChangeText={setMinutes} placeholder="0–1,440" keyboardType="number-pad" autoFocus />
        <View style={styles.quickRow}>{[30, 60, 90, 120, 180].map((value) => <Pressable key={value} onPress={() => setMinutes(String(value))} style={styles.quickChip}><Text style={styles.quickText}>{value}</Text></Pressable>)}</View>
        <View style={styles.scorePreview}><View><Eyebrow>Score preview</Eyebrow><H2>{valid ? `${preview?.roundedScore ?? 0} points` : 'Enter valid minutes'}</H2></View><ScoreBadge score={preview?.roundedScore ?? 0} /></View>
        {message ? <InlineNotice tone={message.includes('saved') ? 'neutral' : 'warning'}>{message}</InlineNotice> : null}
        <Button label={current ? 'Update entry' : 'Save entry'} onPress={save} disabled={!valid || seasonClosed || !eligibleThisWeek} loading={saving} />
      </Card>
      {seasonClosed ? <InlineNotice tone="warning">This season is finalized. Entries are locked.</InlineNotice> : null}
      {!eligibleThisWeek ? <InlineNotice tone="warning">You joined during this week. Your first entry opens when the next week begins.</InlineNotice> : null}
      <InlineNotice>Entries stay editable until the week closes. Reported 0 minutes is a real entry; leaving the day blank is “unreported” and scores 0.</InlineNotice>
    </AppShell>
  );
}

export function ConsequencesScreen({ snapshot, demo, refresh }: ScreenProps) {
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const commissioner = snapshot.league.commissionerId === snapshot.profile.id;
  const assignment = [...snapshot.weeklyResults].reverse().find((result) => result.userId === snapshot.profile.id && result.assignedConsequence);
  const queued = snapshot.consequences.find((item) => item.selected);
  async function suggest() {
    if (!title.trim()) return;
    if (demo) { Alert.alert('Read-only demo', 'Suggestions are disabled in the demo.'); return; }
    setBusy(true);
    try { await api.suggestConsequence(title.trim(), null); setTitle(''); await refresh(); } finally { setBusy(false); }
  }
  async function select(id: string | null) {
    if (demo) return Alert.alert('Read-only demo', 'Commissioner actions are disabled in the demo.');
    setBusy(true);
    try { await api.selectNextConsequence(id); await refresh(); } finally { setBusy(false); }
  }
  async function moderate(id: string, status: 'approved' | 'retired') {
    if (demo) return Alert.alert('Read-only demo', 'Commissioner actions are disabled in the demo.');
    setBusy(true);
    try { await api.moderateConsequence(id, status); await refresh(); } finally { setBusy(false); }
  }
  async function toggleDone() {
    if (!assignment || demo) return;
    setBusy(true);
    try { await api.markConsequenceDone(assignment.id, !assignment.consequenceDone); await refresh(); } finally { setBusy(false); }
  }
  return (
    <AppShell demo={demo}>
      <ScreenTitle eyebrow="Playful stakes" title="Last place, meet consequences." detail="Self-reported, modest, and never financial." />
      <Card accent={colors.orange}>
        <Eyebrow color={colors.orange}>Selected stake</Eyebrow>
        <H2>{snapshot.currentWeek.stake?.title ?? 'No stake selected'}</H2>
        <Body muted>{snapshot.currentWeek.stake?.description ?? 'An exact last-place tie also means no consequence.'}</Body>
      </Card>
      {commissioner ? <Card><Eyebrow>Queued for next week</Eyebrow><H2>{queued?.title ?? 'Nothing queued'}</H2><Body muted>The queue is consumed when the next week is created.</Body>{queued ? <Button label="Clear next week’s stake" variant="ghost" compact onPress={() => select(null)} disabled={busy || demo} /> : null}</Card> : null}
      {assignment ? <Card accent={assignment.consequenceDone ? colors.lime : colors.orange}><Eyebrow>Your assigned consequence</Eyebrow><H2>{assignment.assignedConsequence?.title}</H2><Body muted>{assignment.consequenceDone ? 'Marked done. Respect.' : 'Self-report when you finish it.'}</Body><Button label={assignment.consequenceDone ? 'Mark not done' : 'Mark done'} variant={assignment.consequenceDone ? 'ghost' : 'primary'} onPress={toggleDone} disabled={demo || busy} /></Card> : null}
      <SectionHeader title="Consequence pool" />
      <View style={styles.cardList}>
        {snapshot.consequences.map((item) => (
          <Card key={item.id}>
            <View style={styles.rowBetween}><View style={styles.flex}><H2>{item.title}</H2><Body muted>{item.description ?? 'Suggested by a league member.'}</Body></View><Pill tone={item.status === 'approved' ? 'lime' : 'orange'}>{item.status}</Pill></View>
            {commissioner ? <View style={styles.inlineActions}>{item.status === 'suggested' ? <Button label="Approve" variant="secondary" compact onPress={() => moderate(item.id, 'approved')} disabled={busy || demo} /> : <Button label="Use next week" variant="secondary" compact onPress={() => select(item.id)} disabled={busy || demo} />}<Button label="Retire" variant="ghost" compact onPress={() => moderate(item.id, 'retired')} disabled={busy || demo} /></View> : null}
          </Card>
        ))}
      </View>
      <Card>
        <Eyebrow>Suggest one</Eyebrow>
        <Field label="Consequence" value={title} onChangeText={setTitle} placeholder="Example: Use a flip-phone wallpaper" />
        <Button label="Send suggestion" onPress={suggest} loading={busy} disabled={demo || !title.trim()} />
      </Card>
      <InlineNotice tone="warning">League rule: {snapshot.league.consequenceRules}</InlineNotice>
    </AppShell>
  );
}

export function RecapScreen({ snapshot, demo, weekNumber }: ScreenProps & { weekNumber?: number }) {
  const week = (weekNumber ? snapshot.weeks.find((item) => item.number === weekNumber && item.recap) : null) ?? [...snapshot.weeks].reverse().find((item) => item.recap) ?? null;
  const recap = week?.recap;
  const weekId = week?.id;
  useEffect(() => {
    if (!demo && weekId) void api.trackEvent('recap_viewed', { weekId });
  }, [demo, weekId]);
  if (!week || !recap) return <AppShell demo={demo}><ScreenTitle eyebrow="Weekly recap" title="Nothing to recap yet." detail="The first recap appears after a full week finalizes." /></AppShell>;
  const selectedWeek = week;
  const selectedRecap = recap;
  async function shareRecap() {
    const url = Linking.createURL('/recap', { queryParams: { week: String(selectedWeek.number), ...(demo ? { demo: '1' } : {}) } });
    await Share.share({ title: `${snapshot.league.name} Week ${selectedWeek.number} recap`, message: `${selectedRecap.headline}\n${url}`, url });
  }
  return (
    <AppShell demo={demo}>
      <ScreenTitle eyebrow={`Week ${week.number} recap`} title={recap.headline} detail={`${formatShortDate(week.startDate)}–${formatShortDate(week.endDate)}`} />
      <Card accent={colors.lime}>
        <Eyebrow>Week champion</Eyebrow>
        <View style={styles.rowBetween}><View style={styles.memberIdentity}><Avatar name={recap.champion?.displayName ?? '—'} size={56} active /><View><H2>{recap.champion?.displayName ?? 'No winner'}</H2><Body muted>Top overall weekly score</Body></View></View><ScoreBadge score={recap.champion?.score ?? 0} /></View>
      </Card>
      <View style={styles.cardList}>{recap.lines.map((line, index) => <Card key={line}><Eyebrow>0{index + 1}</Eyebrow><H2>{line}</H2></Card>)}</View>
      {recap.lastPlace ? <Card accent={colors.orange}><Eyebrow color={colors.orange}>The consequence desk</Eyebrow><H2>{recap.lastPlace.displayName} · {recap.lastPlace.score} pts</H2><Body>{recap.lastPlace.consequence ?? 'No stake was selected.'}</Body></Card> : <InlineNotice>Exact last-place tie. The consequence is off.</InlineNotice>}
      <Button label="Share recap link" variant="secondary" onPress={() => void shareRecap()} />
    </AppShell>
  );
}

export function ProfileScreen({ snapshot, demo, refresh }: ScreenProps) {
  const auth = useAuth();
  const me = member(snapshot, snapshot.profile.id)!;
  const [name, setName] = useState(snapshot.profile.displayName);
  const [target, setTarget] = useState(String(me.nextTargetMinutes ?? me.targetMinutes));
  const [avatar, setAvatar] = useState(snapshot.profile.avatarUrl ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function save() {
    if (demo) { setMessage('Profile changes are disabled in the demo.'); return; }
    setBusy(true); setMessage(null);
    try { await api.updateProfile(name.trim(), avatar.trim() || null); await api.setTarget(Number(target)); await refresh(); setMessage('Saved. Your new target takes effect next week.'); }
    catch (caught) { setMessage(caught instanceof Error ? caught.message : 'Could not save your profile.'); }
    finally { setBusy(false); }
  }
  return (
    <AppShell demo={demo}>
      <ScreenTitle eyebrow="Profile & settings" title="Your league identity" detail="Targets are public inside the league and snapshot weekly." />
      <Card>
        <View style={styles.memberIdentity}><Avatar name={name || 'You'} url={demo ? null : avatar} size={72} active /><View><H2>{name || 'Display name'}</H2><Body muted>{me.isCommissioner ? 'Commissioner' : 'League member'}</Body></View></View>
        <Field label="Display name" value={name} onChangeText={setName} maxLength={40} />
        <Field label="Avatar URL (optional)" value={avatar} onChangeText={setAvatar} keyboardType="url" autoCapitalize="none" editable={!demo} hint={demo ? 'External images are disabled in this fictional demo.' : undefined} />
        <Field label="Daily target (minutes)" value={target} onChangeText={setTarget} keyboardType="number-pad" hint="A change is queued for the next week; past scores never move." />
        {me.nextTargetMinutes ? <InlineNotice>{me.nextTargetMinutes} minutes is currently queued for next week.</InlineNotice> : null}
        {message ? <InlineNotice>{message}</InlineNotice> : null}
        <Button label="Save settings" onPress={save} loading={busy} disabled={!name.trim() || !Number.isInteger(Number(target)) || Number(target) < 1 || Number(target) > 1440} />
      </Card>
      <Card><Eyebrow>Account</Eyebrow><Body muted>League: {snapshot.league.name}</Body><Body muted>Time zone: {snapshot.league.timezone}</Body><Body muted>Data source: manual entry</Body></Card>
      {!demo ? <Button label="Sign out" variant="ghost" onPress={() => { void auth.signOut().then(() => router.replace('/')); }} /> : null}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  titleBlock: { gap: spacing.sm, paddingVertical: spacing.sm },
  hero: { gap: spacing.xl, paddingVertical: spacing.md },
  heroWide: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  heroCopy: { flex: 1, gap: spacing.sm },
  heroStats: { flexDirection: 'row', gap: spacing.xl, flexWrap: 'wrap' },
  grid: { gap: spacing.lg },
  gridWide: { flexDirection: 'row' },
  gridCard: { flex: 1, minWidth: 0 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.lg },
  gapSmall: { gap: spacing.xs, flex: 1 },
  flex: { flex: 1 },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayMini: { alignItems: 'center', gap: spacing.xs },
  dayLabel: { color: colors.muted, fontFamily: font.data, fontSize: 10 },
  dayDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.surfaceTint },
  dayDotReported: { backgroundColor: colors.lime },
  dayDotMissing: { backgroundColor: colors.red },
  versus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', paddingVertical: spacing.md },
  playerScore: { flex: 1, alignItems: 'center', gap: spacing.xs },
  playerName: { color: colors.text, fontFamily: font.bodyBold, fontSize: 14 },
  bigScore: { color: colors.text, fontFamily: font.display, fontSize: 38, fontVariant: ['tabular-nums'] },
  megaScore: { color: colors.text, fontFamily: font.display, fontSize: 54, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  rawMinutes: { color: colors.muted, fontFamily: font.data, fontSize: 10, textTransform: 'uppercase', fontVariant: ['tabular-nums'] },
  vs: { color: colors.muted, fontFamily: font.data, fontSize: 11 },
  stakeGlyph: { width: 52, height: 52, borderRadius: 26, textAlign: 'center', textAlignVertical: 'center', color: colors.orange, backgroundColor: '#392414', fontFamily: font.display, fontSize: 32 },
  activityRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', paddingVertical: spacing.sm },
  activityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
  timestamp: { color: colors.muted, fontFamily: font.body, fontSize: 11, marginTop: 2 },
  withDivider: { borderBottomColor: colors.line, borderBottomWidth: 1 },
  cardList: { gap: spacing.md },
  tableHeader: { flexDirection: 'row', paddingBottom: spacing.md, borderBottomColor: colors.line, borderBottomWidth: 1 },
  tableRow: { flexDirection: 'row', minHeight: 64, alignItems: 'center', paddingVertical: spacing.sm },
  tableCell: { flex: 1, color: colors.muted, fontFamily: font.data, fontSize: 10, textTransform: 'uppercase' },
  rankCell: { flex: 0, width: 30 },
  memberCell: { flex: 2 },
  memberIdentity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  memberName: { color: colors.text, fontFamily: font.bodyBold, fontSize: 14 },
  memberTarget: { color: colors.muted, fontFamily: font.body, fontSize: 11 },
  rankNumber: { color: colors.lime, fontFamily: font.display, fontSize: 23, fontVariant: ['tabular-nums'] },
  tableValue: { flex: 1, color: colors.text, fontFamily: font.data, fontSize: 14, fontVariant: ['tabular-nums'] },
  dailyHeader: { flexDirection: 'row', paddingBottom: spacing.sm, borderBottomColor: colors.line, borderBottomWidth: 1 },
  dailyRow: { flexDirection: 'row', alignItems: 'center', minHeight: 68, paddingVertical: spacing.sm },
  dailyText: { flex: 1, color: colors.muted, fontFamily: font.data, fontSize: 10, textTransform: 'uppercase', textAlign: 'center' },
  dailyDay: { flex: 1, alignItems: 'flex-start', textAlign: 'left' },
  dailyResult: { flex: 1, alignItems: 'center' },
  dailyScore: { fontFamily: font.display, fontSize: 23, fontVariant: ['tabular-nums'] },
  trendBlock: { gap: spacing.sm },
  trendRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  trendPoint: { minWidth: 42, flex: 1, alignItems: 'center', backgroundColor: colors.background, borderRadius: radius.sm, paddingVertical: spacing.sm },
  trendValue: { fontFamily: font.display, fontSize: 21, fontVariant: ['tabular-nums'] },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickChip: { backgroundColor: colors.surfaceTint, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  quickText: { color: colors.text, fontFamily: font.data },
  scorePreview: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md },
  inlineActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }
});
