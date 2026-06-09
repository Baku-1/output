import { defineConfig, loadEnv } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig(({ mode }) => {
  // Load .env so the dev proxy can attach the Sky Mavis API key server-side.
  // The key is only read here in the dev-server process — it is NOT injected
  // into the client bundle (we never reference it via import.meta.env in src/).
  const env = loadEnv(mode, process.cwd(), '')
  const skyMavisKey = env.SKY_MAVIS_API_KEY || env.VITE_SKY_MAVIS_API_KEY || ''

  return {
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
        // x-api-key. The key is attached HERE (dev-server side, from .env) so
        // getAxieGenes() works in dev exactly like the hosted api/graphql.js
        // Edge Function — full Spine avatars no longer require deploying.
        '/api/graphql': {
          target: 'https://api-gateway.skymavis.com',
          changeOrigin: true,
          rewrite: () => '/graphql/axie-marketplace',
          headers: skyMavisKey ? { 'x-api-key': skyMavisKey } : {},
        },
        // Classic Axie spine assets (atlas/json/png) for initFromClassicId.
        // assets.axieinfinity.com 403s requests carrying a browser Origin —
        // changeOrigin only rewrites Host, so strip Origin/Referer explicitly.
        '/api/spine-assets': {
          target: 'https://assets.axieinfinity.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/spine-assets/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin')
              proxyReq.removeHeader('referer')
            })
          },
        },
      },
    },
  }
})
