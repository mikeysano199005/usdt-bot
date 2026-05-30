# USDT Sales Bot

A Discord bot + Next.js admin panel for manually selling USDT for INR.

## Project Structure

```
/
├── backend/     Discord bot (Discord.js) + Express REST API
└── admin/       Next.js 14 admin dashboard
```

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- PostgreSQL database

### 1. Backend

```bash
cd backend
npm install
cp ../.env.example .env
# Edit .env with your values
npm run dev
```

### 2. Admin Panel

```bash
cd admin
npm install
# Set INTERNAL_API_URL=http://localhost:4000 in .env.local
npm run dev
# Open http://localhost:3000
```

### 3. Create your first admin account

After the backend starts and migrations run, create an admin user directly in the database:

```sql
INSERT INTO admin_users (username, password_hash)
VALUES ('admin', '$2b$10$REPLACE_WITH_BCRYPT_HASH');
```

To generate a bcrypt hash, run this in Node.js:

```js
const bcrypt = require('bcryptjs');
console.log(await bcrypt.hash('your_password', 10));
```

Or use an online bcrypt generator (cost factor 10).

---

## Railway Deployment

### Step 1 — Create Railway project

1. Go to [railway.app](https://railway.app) → New Project
2. Add **PostgreSQL** plugin — copy the `DATABASE_URL`

### Step 2 — Deploy Backend

1. New Service → GitHub Repo → select this repo
2. Set **Root Directory** to `backend`
3. Build command: `npm install && npm run build`
4. Start command: `node dist/index.js`
5. Add **Volume** → Mount path: `/app/uploads`
6. Add all environment variables from `.env.example`

### Step 3 — Deploy Admin

1. New Service → same GitHub repo
2. Set **Root Directory** to `admin`
3. Build command: `npm install && npm run build`
4. Start command: `node .next/standalone/server.js`
5. Set `NEXT_PUBLIC_API_URL` and `INTERNAL_API_URL` to the backend's Railway public URL

### Step 4 — First Deploy

On first startup:
- PostgreSQL migrations run automatically
- Discord slash commands are registered automatically
- Admin user must be created manually via the DB (see above)

---

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `DATABASE_URL` | backend | PostgreSQL connection string |
| `DISCORD_BOT_TOKEN` | backend | From Discord Developer Portal |
| `DISCORD_CLIENT_ID` | backend | Your Discord application's client ID |
| `DISCORD_GUILD_ID` | backend | Your server's ID (right-click server → Copy ID) |
| `ADMIN_CHANNEL_ID` | backend | Channel ID for new order alerts |
| `PORT` | backend | Express server port (Railway sets automatically) |
| `JWT_SECRET` | backend | Long random string for signing admin tokens |
| `JWT_EXPIRES_IN` | backend | Token expiry (default: `8h`) |
| `UPLOADS_DIR` | backend | Path to screenshot storage (Railway volume) |
| `NEXT_PUBLIC_API_URL` | admin | Backend public URL (used in browser) |
| `INTERNAL_API_URL` | admin | Backend URL for server-side proxy |

---

## Discord Bot Setup

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. New Application → Bot tab → Reset Token → copy `DISCORD_BOT_TOKEN`
3. Copy Application ID as `DISCORD_CLIENT_ID`
4. OAuth2 → URL Generator:
   - Scopes: `bot`, `applications.commands`
   - Permissions: `Send Messages`, `Read Message History`, `Embed Links`
5. Open the generated URL → add bot to your server
6. Enable **Message Content Intent** in Bot settings (required for DM flows)

---

## Bot Commands

| Command | Description |
|---|---|
| `/buy` | Start a USDT purchase (guided flow in DMs) |
| `/status` | View your recent orders |
| `/support` | Get support contact and open order IDs |
| `/help` | Show all commands |

## Order Status Flow

```
pending_payment → payment_submitted → under_review → approved → usdt_sent → completed
                                                    → rejected
```

---

## Admin Dashboard

URL: your Railway admin service URL

- **Dashboard** — order counts by status
- **Orders** — filter, search, view details, approve/reject
- **Order Detail** — view screenshot, update status, add tx hash
- **Users** — list all users, view per-user order history
- **Settings** — exchange rate, UPI ID, bank details, support contact
