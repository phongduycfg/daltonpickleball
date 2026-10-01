import { defineConfig } from 'vitest/config';
import path from 'node:path';

/** Vitest: chạy unit test cho các hàm nghiệp vụ thuần (không cần trình duyệt) */
export default defineConfig({
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
});
