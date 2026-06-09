import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    nodePolyfills({
      // seaport-js uses Buffer internally (generateRandomSalt)
      include: ['buffer'],
      globals: { Buffer: true },
    }),
  ],
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  optimizeDeps: {
    // Only list packages that are actually installed.
    // tanto-kit and wagmi are NOT in node_modules — including them
    // caused Vite to error on dependency optimisation.
    include: ['@sky-mavis/tanto-connect', 'viem', 'ably'],
  },
  server: {
    proxy: {
      // Proxy Sky Mavis GraphQL in dev to bypass browser CORS restrictions.
      // graphql-gateway.axieinfinity.com is Cloudflare-protected against direct
      // browser calls but allows server-to-server requests. The Vite proxy makes
      // a server-side request so Cloudflare passes it through.
      // NOTE: if Cloudflare blocks the dev machine's IP, test on the hosted domain
      // where the Vercel Edge Function (api/graphql.js) handles it instead.
      // Production uses api/graphql.js (Vercel Edge Function).
      '/api/graphql': {
        target: 'https://graphql-gateway.axieinfinity.com',
        changeOrigin: true,
        rewrite: () => '/graphql',
      },
      // Classic Axie spine assets (atlas/json/png) for initFromClassicId.
      // assets.axieinfinity.com returns 403 from the browser directly but
      // allows server-to-server requests; the proxy removes the browser Origin.
      '/api/spine-assets': {
        target: 'https://assets.axieinfinity.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/spine-assets/, ''),
      },
    },
  },
})
