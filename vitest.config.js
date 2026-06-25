import { defineConfig } from 'vitest/config'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    nodePolyfills({ include: ['buffer'], globals: { Buffer: true } }),
  ],
  test: {
    globals: true,
    environment: 'node',
  },
})
