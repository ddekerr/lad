#!/usr/bin/env node
/**
 * Запускає команду з локальними змінними середовища: `node scripts/with-env.mjs prisma migrate dev`.
 * Prisma CLI читає лише `.env`, тому файли розробки підтягуємо самі: `.env.local` (ваші секрети),
 * потім `.env.development` (спільні значення для локалки). Змінні, що вже задані в оточенні
 * (наприклад у CI чи на сервері), нічим не перекриваються.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const command = process.argv.slice(2);
if (command.length === 0) {
  console.error('Використання: node scripts/with-env.mjs <команда> [аргументи]');
  process.exit(2);
}

for (const file of ['.env.local', '.env.development']) {
  if (existsSync(file)) process.loadEnvFile(file);
}

const child = spawn(command[0], command.slice(1), {
  stdio: 'inherit',
  env: process.env,
  // На Windows бінарники npm це .cmd, їх без оболонки не запустити
  shell: process.platform === 'win32',
});
child.on('error', (error) => {
  console.error(`Не вдалося запустити «${command[0]}»: ${error.message}`);
  process.exit(1);
});
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
