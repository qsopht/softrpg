const app = require('./app');
const config = require('./config');
const { connect: connectRedis } = require('./cache');

async function start() {
  // Try to connect Redis, but don't block if it fails
  try {
    await connectRedis();
  } catch (err) {
    console.warn('Redis optional setup skipped:', err.message);
  }

  app.listen(config.port, () => {
    console.log(`SoftRPG server running on port ${config.port} [${config.nodeEnv}]`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
