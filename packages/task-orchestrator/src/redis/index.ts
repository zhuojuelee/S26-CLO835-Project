import { Redis } from 'ioredis';

const redisHost = process.env.REDIS_HOST ?? 'localhost';
const redisPort = Number(process.env.REDIS_PORT ?? 6379);

export const redisConnection = {
  host: redisHost,
  port: redisPort,
};

const redis = new Redis({
  ...redisConnection,
  maxRetriesPerRequest: 1,
  lazyConnect: true,
});

export default redis;
