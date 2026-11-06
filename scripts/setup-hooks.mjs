#!/usr/bin/env node
/** Підключає git-хуки з .githooks (запускається в `npm install` через скрипт prepare). Поза git-репозиторієм і в CI нічого не робить. */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

if (process.env.CI || !existsSync('.git')) process.exit(0);
try {
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'ignore' });
} catch {
  // git недоступний: хуки не критичні, захист main тримається на GitHub
}
