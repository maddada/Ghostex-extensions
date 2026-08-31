import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // jsdom, not happy-dom: happy-dom's WheelEvent drops ctrlKey and clientX,
    // which is exactly the geometry this canvas is built on.
    // Preact JSX comes from tsconfig.json (jsx: react-jsx, jsxImportSource: preact).
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
});
