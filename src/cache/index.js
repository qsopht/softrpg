const redis = require('redis');
const config = require('../config');

const client = redis.createClient({ url: config.redisUrl });

client.on('error', (err) => console.error('Redis client error', err));

function connect() {
  return new Promise((resolve, reject) => {
    if (client.connected) {
      console.log('Redis connected');
      return resolve();
    }
    client.once('ready', () => {
      console.log('Redis connected');
      resolve();
    });
    client.once('error', reject);
  });
}

module.exports = { client, connect };
