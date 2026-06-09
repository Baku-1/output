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
      // The Vite dev server proxies the request server-to-server so no
      // Access-Control-Allow-Origin header is required from Sky Mavis.
      // Production uses api/graphql.js (Vercel Edge Function).
      '/api/graphql': {
        target: 'https://marketplace-graphql.skymavis.com',
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
