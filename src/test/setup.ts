import { afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { reset } from './stubs/firestore';

afterEach(() => {
  cleanup();
  localStorage.clear();
  reset();
});

// happy-dom leaves a few browser APIs out that Ant Design components touch
// while mounting; provide inert stand-ins so rendering never crashes on them.
if (typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

