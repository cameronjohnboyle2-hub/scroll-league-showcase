// A portfolio export must never initialize a backend, even if credentials exist.
export const isPortfolioDemo = process.env.EXPO_PUBLIC_PORTFOLIO_DEMO === '1';
