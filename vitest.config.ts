import { defineConfig } from 'vitest';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    exclude: [
      'node_modules',
      'dist',
      '**/*.d.ts'
    ],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '**/*.spec.ts',
        'src/test-setup.ts'
      ]
    }
  },
  resolve: {
    mainFields: ['browser', 'module', 'main']
  }
});