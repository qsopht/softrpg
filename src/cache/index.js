const redis = require('redis');
const config = require('../config');

const client = redis.createClient({ url: config.redisUrl });
let isConnected = false;

client.on('error', (err) => {
  if (isConnected) {
    console.warn('Redis connection lost:', err.message);
  }
  // Non-blocking: log but don't crash
});

client.on('ready', () => {
  isConnected = true;
  console.log('Redis connected');
});

function connect() {
  // Non-blocking connection attempt
  // App will start immediately; Redis is optional
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.log('Redis connection timeout (optional, app will continue)');
      resolve();
    }, 3000);

    client.once('ready', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

module.exports = { client, connect, isConnected: () => isConnected };
