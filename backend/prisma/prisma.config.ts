import { defineConfig } from '@prisma/cli';

export default defineConfig({
  datasource: {
    provider: 'postgresql',
    url: process.env.DATABASE_URL,
    adapter: 'postgresql',
  },
});
