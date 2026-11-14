import { createClient } from 'redis';

const redis = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
});

redis.on('error', (err) => console.error('Redis Client Error', err));

await redis.connect();

export default redis;
