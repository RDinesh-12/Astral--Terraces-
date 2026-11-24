import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  base: './',
  build: {
    chunkSizeWarningLimit: 2600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@dimforge/rapier3d-compat') || id.includes('@react-three/rapier')) {
              return 'vendor-rapier';
            }
            if (id.includes('/three/') || id.includes('\\three\\') || id.includes('@react-three/fiber')) {
              return 'vendor-three';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-lucide';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            return 'vendor-misc';
          }
        }
      }
    }
  }
})
