import { AppGate } from '../src/components/AppGate';
import { HomeScreen } from '../src/features/screens';

export default function DemoRoute() {
  return <AppGate demo>{(state) => <HomeScreen snapshot={state.snapshot} demo refresh={state.refresh} />}</AppGate>;
}
