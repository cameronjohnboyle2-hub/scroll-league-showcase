import { isPortfolioDemo } from '../src/config/runtime';
import { useLocalSearchParams } from 'expo-router';
import { AppGate } from '../src/components/AppGate';
import { EntryScreen } from '../src/features/screens';

export default function EntryRoute() {
  const { demo, date } = useLocalSearchParams<{ demo?: string; date?: string }>();
  const isDemo = isPortfolioDemo || demo === '1';
  return <AppGate demo={isDemo}>{(state) => <EntryScreen snapshot={state.snapshot} demo={isDemo} refresh={state.refresh} initialDate={date} />}</AppGate>;
}
