export type EntrySource = 'manual' | 'ios_screen_time' | 'android_usage_stats';

export type Profile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export type League = {
  id: string;
  name: string;
  timezone: string;
  commissionerId: string;
  consequenceRules: string;
  inviteCode?: string;
};

export type Member = Profile & {
  targetMinutes: number;
  nextTargetMinutes: number | null;
  eligibleFromWeek: number;
  record: string;
  rank: number;
  score: number;
  unreportedDays: number;
  isCommissioner?: boolean;
};

export type ScreenTimeEntry = {
  id?: string;
  userId: string;
  localDate: string;
  minutes: number;
  source: EntrySource;
  evidenceRef: string | null;
};

export type DailyScore = {
  localDate: string;
  minutes: number | null;
  targetMinutes: number;
  roundedScore: number;
  unroundedScore: number;
  status: 'reported' | 'unreported' | 'future';
};

export type WeeklyPerformance = {
  userId: string;
  days: DailyScore[];
  displayedScore: number;
  roundedDailyAverage: number;
  unroundedAverage: number;
  unreportedDays: number;
  isFinal: boolean;
};

export type Matchup = {
  id: string;
  weekNumber: number;
  memberAId: string;
  memberBId: string | null;
  memberAScore: number | null;
  memberBScore: number | null;
  winnerId: string | null;
  isTie: boolean;
  status: 'scheduled' | 'active' | 'final';
};

export type StandingResult = {
  userId: string;
  outcome: 'win' | 'loss' | 'tie' | 'bye';
  score: number;
  unreportedDays: number;
};

export type Standing = {
  userId: string;
  wins: number;
  losses: number;
  ties: number;
  games: number;
  winPercentage: number;
  totalScore: number;
  unreportedDays: number;
  rank: number;
};

export type Consequence = {
  id: string;
  title: string;
  description: string | null;
  status: 'suggested' | 'approved' | 'retired';
  selected?: boolean;
};

export type WeeklyResult = {
  id: string;
  weekId: string;
  userId: string;
  outcome: 'win' | 'loss' | 'tie' | 'bye';
  displayedScore: number;
  unreportedDays: number;
  assignedConsequence: Consequence | null;
  consequenceDone: boolean;
};

export type ActivityEvent = {
  id: string;
  type: 'entry' | 'result' | 'consequence' | 'member';
  text: string;
  createdAt: string;
};

export type WeekSummary = {
  id: string;
  number: number;
  startDate: string;
  endDate: string;
  status: 'pending' | 'active' | 'finalized';
  stake: Consequence | null;
  recap: RecapPayload | null;
};

export type WeekParticipantSnapshot = {
  weekId: string;
  userId: string;
  targetMinutes: number;
  hasBye: boolean;
};

export type RecapPayload = {
  version: 1;
  weekNumber: number;
  headline: string;
  champion: { userId: string; displayName: string; score: number } | null;
  closestMatchup: { matchupId: string; margin: number } | null;
  bestDay: { userId: string; displayName: string; localDate: string; score: number } | null;
  lastPlace: { userId: string; displayName: string; score: number; consequence: string | null } | null;
  lines: string[];
};

export type AppSnapshot = {
  profile: Profile;
  league: League;
  members: Member[];
  season: { id: string; number: number; status: 'active' | 'completed' } | null;
  currentWeek: WeekSummary | null;
  weeks: WeekSummary[];
  weekParticipants: WeekParticipantSnapshot[];
  entries: ScreenTimeEntry[];
  matchups: Matchup[];
  consequences: Consequence[];
  weeklyResults: WeeklyResult[];
  activity: ActivityEvent[];
  standings: Standing[];
};

export type ActiveAppSnapshot = AppSnapshot & {
  season: NonNullable<AppSnapshot['season']>;
  currentWeek: NonNullable<AppSnapshot['currentWeek']>;
};
