'use strict';
const Redis = require('ioredis');

let client = null;
let connectionFailed = false;

function getRedisClient() {
  if (connectionFailed) return null;
  if (client) return client;

  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
      connectTimeout: 2000,
    });

    client.on('error', (err) => {
      // Degrade gracefully — rate limiters fall back to in-memory
      if (!connectionFailed) {
        console.warn('[redis] connexion echouee, mode memoire actif:', err.message);
        connectionFailed = true;
        client = null;
      }
    });

    client.on('connect', () => {
      connectionFailed = false;
      console.info('[redis] connecte a', url);
    });
  } catch (err) {
    console.warn('[redis] init echouee:', err.message);
    connectionFailed = true;
    client = null;
  }

  return client;
}

async function redisIncr(key, ttlSeconds) {
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, ttlSeconds, 'NX');
    const results = await pipeline.exec();
    return results[0][1]; // count
  } catch {
    return null;
  }
}

async function redisTtl(key) {
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    return await redis.ttl(key);
  } catch {
    return null;
  }
}

module.exports = { getRedisClient, redisIncr, redisTtl };
