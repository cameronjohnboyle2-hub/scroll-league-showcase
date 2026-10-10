import { isPortfolioDemo } from '../src/config/runtime';
import { useLocalSearchParams } from 'expo-router';
import { AppGate } from '../src/components/AppGate';
import { ProfileScreen } from '../src/features/screens';

export default function ProfileRoute() {
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  const isDemo = isPortfolioDemo || demo === '1';
  return <AppGate demo={isDemo}>{(state) => <ProfileScreen snapshot={state.snapshot} demo={isDemo} refresh={state.refresh} />}</AppGate>;
}
