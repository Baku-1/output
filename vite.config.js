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
})
