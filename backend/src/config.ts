function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

const config = {
  port: parseInt(optionalEnv('PORT', '4000'), 10),
  nodeEnv: optionalEnv('NODE_ENV', 'development'),

  db: {
    url: requireEnv('DATABASE_URL'),
  },

  discord: {
    botToken: requireEnv('DISCORD_BOT_TOKEN'),
    clientId: requireEnv('DISCORD_CLIENT_ID'),
    guildId: requireEnv('DISCORD_GUILD_ID'),
    adminChannelId: requireEnv('ADMIN_CHANNEL_ID'),
  },

  jwt: {
    secret: requireEnv('JWT_SECRET'),
    expiresIn: optionalEnv('JWT_EXPIRES_IN', '8h'),
  },

  uploads: {
    dir: optionalEnv('UPLOADS_DIR', './uploads'),
  },

  // Bank-SMS-to-email payment verification. Leave host blank to disable.
  imap: {
    host: optionalEnv('IMAP_HOST', ''),
    port: parseInt(optionalEnv('IMAP_PORT', '993'), 10),
    user: optionalEnv('IMAP_USER', ''),
    password: optionalEnv('IMAP_PASSWORD', ''),
    pollIntervalMs: parseInt(optionalEnv('IMAP_POLL_INTERVAL_MS', '30000'), 10),
  },

  // Shared secret for the MacroDroid -> /api/payment-webhook endpoint.
  // Blank disables the webhook (every request is rejected).
  webhook: {
    secret: optionalEnv('PAYMENT_WEBHOOK_SECRET', ''),
  },
} as const;

export default config;
