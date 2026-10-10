# URL decoder compatibility patch

This is the official `decode-uri-component@0.5.0` implementation, adapted to CommonJS for Expo Router 57's existing `query-string@7` dependency. The algorithm is unchanged: only `export default` becomes a named function and `module.exports`, with a strict-mode directive. The upstream MIT license is included.

Upstream: https://github.com/SamVerschueren/decode-uri-component/tree/v0.5.0
Advisory: https://github.com/advisories/GHSA-vcc3-ghjq-m6fr

Official npm tarball SHA-256: `f42d289f996e6c9f0e33d8f31de1fe9a7a077c612dca489cafdb2df4cbb6122f`
Original index.js SHA-256: `9401353df38f8010ad7035fe8d666bce6a4902bc1cff809afc4ab23fa2e0bdaa`

The package override is restricted to query-string. Remove it after upgrading to an Expo SDK whose router already uses the patched decoder. The release tests exercise route query parsing, Unicode, malformed sequences, and a long invalid sequence through the consuming query-string package.
