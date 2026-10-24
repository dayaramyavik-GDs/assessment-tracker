const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const { createApp } = require('./app');

async function start() {
  await connectDB(env.mongoUri);
  const server = createApp().listen(env.port, '0.0.0.0', () => {
    console.log(`API listening on port ${env.port} (${env.nodeEnv})`);
  });

  // Docker sends SIGTERM on 'docker compose stop' — finish requests, then close the DB
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});