import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    port: 5173,
    fs: { allow: ['../..'] },
  },
  resolve: {
    alias: {
      'suportum-chat': path.resolve(__dirname, '../../packages/suportum-chat/src/index.ts'),
    },
  },
})
