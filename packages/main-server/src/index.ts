import cors from "cors";
import express from "express";
import { Redis } from "ioredis";
import type { HealthResponse } from "@clo835-project/shared";

const port = Number(process.env.PORT ?? 3000);
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

app.listen(port, () => {
  console.log(`${serviceName} listening on port ${port}`);
});
