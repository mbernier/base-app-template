import '@testing-library/jest-dom/vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load env file for DB integration tests — prefer .env.test, fall back to .env.local
for (const filename of ['.env.test', '.env.local']) {
  const envPath = resolve(__dirname, filename);
  if (existsSync(envPath)) {
    const envFile = readFileSync(envPath, 'utf-8');
    for (const line of envFile.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed
        .slice(eqIdx + 1)
        .trim()
        .replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
    break;
  }
}
