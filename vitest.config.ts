import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Tests replace the Firebase SDK and the local firebase module with in-memory
// stubs, so the suite runs without network access or credentials. The aliases
// reuse the same recorded Firestore/Auth doubles the build harnesses used.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'firebase/firestore': fileURLToPath(new URL('./src/test/stubs/firestore.ts', import.meta.url)),
      'firebase/auth': fileURLToPath(new URL('./src/test/stubs/auth.ts', import.meta.url)),
      '../firebase': fileURLToPath(new URL('./src/test/stubs/firebase-app.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});