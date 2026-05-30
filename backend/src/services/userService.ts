import { query } from '../db/pool';
import { User } from '../types/user';

export async function upsertUser(data: {
  discordId: string;
  username: string | null;
  displayName: string | null;
}): Promise<User> {
  const { rows } = await query<User>(
    `INSERT INTO users (discord_id, username, display_name, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (discord_id) DO UPDATE
       SET username = EXCLUDED.username,
           display_name = EXCLUDED.display_name,
           updated_at = NOW()
     RETURNING *`,
    [data.discordId, data.username, data.displayName]
  );
  return rows[0];
}

export async function getUserByDiscordId(discordId: string): Promise<User | null> {
  const { rows } = await query<User>(
    'SELECT * FROM users WHERE discord_id = $1',
    [discordId]
  );
  return rows[0] ?? null;
}

export async function getAllUsers(limit = 50, offset = 0): Promise<{ users: User[]; total: number }> {
  const [{ rows: users }, { rows: countRows }] = await Promise.all([
    query<User>(
      'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    ),
    query<{ count: string }>('SELECT COUNT(*) as count FROM users'),
  ]);
  return { users, total: parseInt(countRows[0].count, 10) };
}

export async function getUserById(id: number): Promise<User | null> {
  const { rows } = await query<User>('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] ?? null;
}
