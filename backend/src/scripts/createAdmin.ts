import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { query, runMigrations } from '../db/pool';

async function main() {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    console.error('Usage: npm run create-admin <username> <password>');
    process.exit(1);
  }

  await runMigrations();

  const hash = await bcrypt.hash(password, 10);
  await query(
    'INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)',
    [username, hash]
  );

  console.log(`✅ Admin user "${username}" created successfully.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
