export const demoCsp = "default-src 'self'; connect-src 'none'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-src 'none'; form-action 'none'; worker-src 'none'";

export function demoEnvironment(env = process.env) {
  const result = { ...env, EXPO_PUBLIC_PORTFOLIO_DEMO: '1', EXPO_NO_DOTENV: '1', EXPO_NO_TELEMETRY: '1', CI: '1' };
  for (const key of Object.keys(result)) {
    if (key.startsWith('EXPO_PUBLIC_') && key !== 'EXPO_PUBLIC_PORTFOLIO_DEMO') delete result[key];
  }
  return result;
}
