import { isPortfolioDemo } from '../src/config/runtime';
import { useLocalSearchParams } from 'expo-router';
import { AppGate } from '../src/components/AppGate';
import { HomeScreen } from '../src/features/screens';

export default function HomeRoute() {
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  const isDemo = isPortfolioDemo || demo === '1';
  return <AppGate demo={isDemo}>{(state) => <HomeScreen snapshot={state.snapshot} demo={isDemo} refresh={state.refresh} />}</AppGate>;
}
