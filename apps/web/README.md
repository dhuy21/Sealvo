# Web

Next.js 16 app for Sealvo. How to run it locally, and how it is deployed, is in the
[repository README](../../README.md).

The browser talks to the API URL from `/env.js`. Security headers and the CSP nonce
are set in `src/proxy.ts`.
