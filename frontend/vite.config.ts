import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Disable source maps in production to prevent source code visibility
    sourcemap: false,
    // Aggressive minification (esbuild is faster and already available)
    minify: 'esbuild',
    // Chunk splitting for better obfuscation and code organization
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
        // Compact output for better obfuscation
        compact: true,
      },
    },
  },
  // Remove console and debugger statements in production
  esbuild: {
    drop: ['console', 'debugger'],
  },
})

