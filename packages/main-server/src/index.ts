import cors from "cors";
import express from "express";
import { Redis } from "ioredis";
import {
  JOB_KEY_PREFIX,
  type HealthResponse,
  type JobRecord
} from "@clo835-project/shared";

const port = Number(process.env.MAIN_SERVER_PORT ?? process.env.PORT ?? 3000);
const serviceName = "main-server";
const redisHost = process.env.REDIS_HOST ?? "localhost";
const redisPort = Number(process.env.REDIS_PORT ?? 6379);

const redis = new Redis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: 1,
  lazyConnect: true
});

const app = express();
app.use(cors());
app.use(express.json());

async function scanJobKeys(): Promise<string[]> {
  const keys: string[] = [];
  let cursor = "0";

  do {
    const [nextCursor, foundKeys] = await redis.scan(
      cursor,
      "MATCH",
      `${JOB_KEY_PREFIX}*`,
      "COUNT",
      100
    );

    cursor = nextCursor;
    keys.push(...foundKeys);
  } while (cursor !== "0");

  return keys;
}

app.get("/health", async (_request, response) => {
  let redisOk = false;

  try {
    await redis.ping();
    redisOk = true;
  } catch {
    redisOk = false;
  }

  const body: HealthResponse = {
    service: serviceName,
    ok: redisOk,
    timestamp: new Date().toISOString()
  };

  response.status(redisOk ? 200 : 503).json(body);
});

app.get("/jobs", async (_request, response) => {
  try {
    const keys = await scanJobKeys();

    if (keys.length === 0) {
      response.json([]);
      return;
    }

    const values = await redis.mget(keys);
    const jobs: Array<Record<string, JobRecord>> = [];

    for (const [index, value] of values.entries()) {
      if (!value) {
        continue;
      }

      jobs.push({
        [keys[index]]: JSON.parse(value) as JobRecord
      });
    }

    response.json(jobs);
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : "Failed to read jobs"
    });
  }
});

app.listen(port, () => {
  console.log(`${serviceName} listening on port ${port}`);
});
