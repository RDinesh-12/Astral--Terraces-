import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import playgamaBridge from '@playgama/bridge/vite'

function playgamaEarlyInitPlugin(): Plugin {
  return {
    name: 'playgama-early-init',
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          children:
            'if (window.bridge && typeof window.bridge.initialize === "function") { window.__playgamaInitPromise = window.bridge.initialize().catch(function () {}); }',
          injectTo: 'head',
        },
      ]
    },
  }
}

export default defineConfig(({ mode }) => {
  const isPlaygama = mode === 'playgama'

  return {
    plugins: [
      tailwindcss(),
      react(),
      ...(isPlaygama ? [playgamaBridge({ mode: 'cdn' }), playgamaEarlyInitPlugin()] : []),
    ],
    base: './',
    server: {
      host: true,
      port: 3000
    },
    build: {
      outDir: isPlaygama ? 'dist-playgama' : 'docs',
      modulePreload: false,
      chunkSizeWarningLimit: 2600,
    }
  }
})
