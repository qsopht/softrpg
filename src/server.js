const app = require('./app');
const config = require('./config');
const { connect: connectRedis } = require('./cache');

async function start() {
  await connectRedis();

  app.listen(config.port, () => {
    console.log(`SoftRPG server running on port ${config.port} [${config.nodeEnv}]`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
