import { isPortfolioDemo } from '../src/config/runtime';
import { useLocalSearchParams } from 'expo-router';
import { AppGate } from '../src/components/AppGate';
import { RecapScreen } from '../src/features/screens';

export default function RecapRoute() {
  const { demo, week } = useLocalSearchParams<{ demo?: string; week?: string }>();
  const isDemo = isPortfolioDemo || demo === '1';
  return <AppGate demo={isDemo}>{(state) => <RecapScreen snapshot={state.snapshot} demo={isDemo} refresh={state.refresh} weekNumber={week ? Number(week) : undefined} />}</AppGate>;
}
