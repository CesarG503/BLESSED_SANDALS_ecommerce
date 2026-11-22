// Purge require.cache for prisma to ensure newly generated clients are picked up
try {
  if (typeof require !== 'undefined' && require.cache) {
    Object.keys(require.cache).forEach((key) => {
      if (key.includes('@prisma') || key.includes('.prisma')) {
        delete require.cache[key];
      }
    });
  }
} catch {}

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

export default prisma;
