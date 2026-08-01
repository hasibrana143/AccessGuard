#!/usr/bin/env node
/**
 * AccessGuard DB backup/restore.
 *
 * Backs up the Postgres database using pg_dump (local binary or docker exec),
 * writing timestamped .sql files to ./backups (or BACKUP_DIR).
 *
 * Usage:
 *   npm run db:backup              # create a backup
 *   npm run db:restore <file>      # restore from a backup file
 *   npm run db:backup -- --prune   # keep only the last 7 backups
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://accessguard:accessguard@localhost:5432/accessguard';
const BACKUP_DIR = resolve(process.env.BACKUP_DIR || 'backups');
const KEEP_BACKUPS = Number(process.env.KEEP_BACKUPS || '7');
const CONTAINER_ENV = process.env.POSTGRES_CONTAINER;

const command = process.argv[2] || 'backup';
const arg = process.argv[3];

function parseDbUrl(url) {
  const m = url.match(/^postgres(ql)?:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/(.+)$/);
  if (!m) throw new Error(`Cannot parse DATABASE_URL: ${url}`);
  return { user: m[2], password: m[3], host: m[4], port: m[5] || '5432', database: m[6].split('?')[0] };
}

function dockerAvailable() {
  try {
    execSync('docker ps --format "{{.Names}}"', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function findContainer(dbUrl) {
  if (CONTAINER_ENV) return CONTAINER_ENV;
  if (!dockerAvailable()) return null;
  const names = execSync('docker ps --format "{{.Names}}"', { stdio: 'pipe', encoding: 'utf8' }).trim().split('\n');
  return names.find((n) => /postgres/i.test(n)) || null;
}

function run(command) {
  return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
}

function backup() {
  const { user, database } = parseDbUrl(DATABASE_URL);
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });

  const file = join(BACKUP_DIR, `accessguard-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`);
  const container = findContainer(DATABASE_URL);

  let cmd;
  if (container) {
    cmd = `docker exec ${container} pg_dump -U ${user} -d ${database}`;
  } else {
    cmd = `pg_dump -U ${user} -h ${parseDbUrl(DATABASE_URL).host} -p ${parseDbUrl(DATABASE_URL).port} -d ${database}`;
    process.env.PGPASSWORD = parseDbUrl(DATABASE_URL).password;
  }

  run(`${cmd} > "${file}"`);
  const size = (statSync(file).size / 1024).toFixed(1);
  console.log(`Backup written: ${file} (${size} KB)`);

  if (process.argv.includes('--prune')) prune();
  return file;
}

function prune() {
  const files = readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('accessguard-') && f.endsWith('.sql'))
    .map((f) => ({ f, t: statSync(join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);

  for (const { f } of files.slice(KEEP_BACKUPS)) {
    rmSync(join(BACKUP_DIR, f));
    console.log(`Pruned old backup: ${f}`);
  }
}

function restore(file) {
  if (!file) {
    console.error('Usage: npm run db:restore <backup-file>');
    process.exit(1);
  }
  const path = resolve(file);
  if (!existsSync(path)) {
    console.error(`Backup file not found: ${path}`);
    process.exit(1);
  }

  const { user, database } = parseDbUrl(DATABASE_URL);
  const container = findContainer(DATABASE_URL);

  if (container) {
    run(`docker exec -i ${container} psql -U ${user} -d ${database} < "${path}"`);
  } else {
    const dbUrl = parseDbUrl(DATABASE_URL);
    process.env.PGPASSWORD = dbUrl.password;
    run(`psql -U ${user} -h ${dbUrl.host} -p ${dbUrl.port} -d ${database} < "${path}"`);
  }
  console.log(`Restored from: ${path}`);
}

try {
  if (command === 'backup') backup();
  else if (command === 'restore') restore(arg);
  else {
    console.error(`Unknown command: ${command}. Use "backup" or "restore <file>".`);
    process.exit(1);
  }
} catch (error) {
  console.error(`DB ${command} failed:`, error.message || error);
  process.exit(1);
}
