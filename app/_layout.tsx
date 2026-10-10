import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { BarlowCondensed_900Black } from '@expo-google-fonts/barlow-condensed/900Black';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSyncExternalStore } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/auth/AuthProvider';
import { colors } from '../src/theme';
import { isPortfolioDemo } from '../src/config/runtime';

const subscribeToClient = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export default function RootLayout() {
  const mounted = useSyncExternalStore(subscribeToClient, clientReady, serverReady);
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_700Bold,
    BarlowCondensed_900Black,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold
  });

  // Static exports cannot snapshot a visitor's viewport, timezone, or current day.
  // Use the same first-render shell, then render relative fixtures on the client.
  if (isPortfolioDemo && !mounted) return <View style={{ flex: 1, minHeight: 400, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}><Text style={{ color: colors.text }}>Loading the fictional demo…</Text></View>;
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'fade' }} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
