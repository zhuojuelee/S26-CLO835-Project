import { randomUUID } from "node:crypto";
import cors from "cors";
import express from "express";
import { Queue } from "bullmq";
import { Redis } from "ioredis";
import {
  JOB_QUEUE_NAME,
  getJobKey,
  type CreateQueueJobRequest,
  type CreateQueueJobResponse,
  type HealthResponse,
  type JobRecord,
  type QueueJobPayload,
} from "@clo835-project/shared";

const port = Number(
  process.env.TASK_ORCHESTRATOR_PORT ?? process.env.PORT ?? 3001,
);
const serviceName = "task-orchestrator";
const redisHost = process.env.REDIS_HOST ?? "localhost";
const redisPort = Number(process.env.REDIS_PORT ?? 6379);
const queueName = process.env.QUEUE_NAME ?? JOB_QUEUE_NAME;

const connection = {
  host: redisHost,
  port: redisPort,
};

const redis = new Redis({
  ...connection,
  maxRetriesPerRequest: 1,
  lazyConnect: true,
});

const jobQueue = new Queue<QueueJobPayload>(queueName, {
  connection,
});

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_request, response) => {
  const body: HealthResponse = {
    service: serviceName,
    ok: true,
    timestamp: new Date().toISOString(),
  };

  response.json(body);
});

app.post("/queueJob", async (request, response) => {
  const { durationSeconds, message } = request.body as CreateQueueJobRequest;

  const jobId = randomUUID();
  const jobKey = getJobKey(jobId);
  const record: JobRecord = {
    jobId,
    status: "pending",
    data: {
      durationSeconds,
      message,
    },
    results: {
      output: "",
    },
  };

  await redis.set(jobKey, JSON.stringify(record));
  await jobQueue.add(
    jobKey,
    { jobId },
    {
      attempts: 3,
      backoff: {
        type: "fixed",
        delay: 1000,
      },
      jobId,
      removeOnComplete: true,
      removeOnFail: false,
    },
  );

  const responseBody: CreateQueueJobResponse = {
    queueName,
    ...record,
  };

  response.status(202).json(responseBody);
});

app.listen(port, () => {
  console.log(`${serviceName} listening on port ${port}`);
});
