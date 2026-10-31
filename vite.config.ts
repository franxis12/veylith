import { levelEditorPlugin } from './server/editorPlugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), levelEditorPlugin()],
  base: './',
  build: {
    target: ['es2020', 'safari15'],
  },
  test: {
    environment: 'happy-dom',
    include: ['src/tests/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    clearMocks: true,
  },
});
