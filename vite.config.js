import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  optimizeDeps: {
    // Only list packages that are actually installed.
    // tanto-kit and wagmi are NOT in node_modules — including them
    // caused Vite to error on dependency optimisation.
    include: ['@sky-mavis/tanto-connect', 'viem'],
  },
})
