import { query } from '../db/pool';

const cache = new Map<string, { value: string; expiresAt: number }>();
const TTL_MS = 60_000;

export async function getSetting(key: string): Promise<string | null> {
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  const { rows } = await query<{ value: string }>(
    'SELECT value FROM settings WHERE key = $1',
    [key]
  );
  if (rows.length === 0) return null;

  cache.set(key, { value: rows[0].value, expiresAt: Date.now() + TTL_MS });
  return rows[0].value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await query(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [key, value]
  );
  cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const { rows } = await query<{ key: string; value: string }>(
    'SELECT key, value FROM settings ORDER BY key'
  );
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
    cache.set(row.key, { value: row.value, expiresAt: Date.now() + TTL_MS });
  }
  return result;
}

export function clearCache(): void {
  cache.clear();
}
