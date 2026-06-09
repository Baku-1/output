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
      // Proxy Sky Mavis GraphQL through the official API gateway in dev.
      // api-gateway.skymavis.com/graphql/axie-marketplace authenticates via
      // x-api-key and is not subject to the Cloudflare challenge that blocks
      // direct requests to graphql-gateway.axieinfinity.com.
      // Note: dev proxy does not add x-api-key — test authenticated calls on
      // the hosted domain where api/graphql.js adds the key server-side.
      '/api/graphql': {
        target: 'https://api-gateway.skymavis.com',
        changeOrigin: true,
        rewrite: () => '/graphql/axie-marketplace',
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
