import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const baseUrl = process.env.EXPO_PUBLIC_PORTFOLIO_DEMO === '1'
    ? process.env.PORTFOLIO_BASE_PATH ?? '/scroll-league-showcase'
    : '';
  if (baseUrl && !/^\/[A-Za-z0-9_-]+$/.test(baseUrl)) throw new Error('Use a single repository path for PORTFOLIO_BASE_PATH.');
  return { ...config, name: config.name ?? 'Scroll League', slug: config.slug ?? 'scroll-league', experiments: { ...config.experiments, baseUrl } };
};
