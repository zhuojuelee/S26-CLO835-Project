import { hostname } from "node:os";
import { Worker } from "bullmq";
import { Redis } from "ioredis";
import {
  JOB_QUEUE_NAME,
  getJobKey,
  type JobRecord,
  type QueueJobPayload
} from "@clo835-project/shared";

const serviceName = "bullmq-worker";
const redisHost = process.env.REDIS_HOST ?? "localhost";
const redisPort = Number(process.env.REDIS_PORT ?? 6379);
const queueName = process.env.QUEUE_NAME ?? JOB_QUEUE_NAME;
const workerId = `${serviceName}-${hostname()}`;

const connection = {
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null
};

const redis = new Redis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: 1,
  lazyConnect: true
});

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function readJobRecord(jobId: string): Promise<JobRecord> {
  const rawRecord = await redis.get(getJobKey(jobId));

  if (!rawRecord) {
    throw new Error(`Missing Redis job record for ${jobId}`);
  }

  return JSON.parse(rawRecord) as JobRecord;
}

async function writeJobRecord(jobId: string, record: JobRecord): Promise<void> {
  await redis.set(getJobKey(jobId), JSON.stringify(record));
}

const worker = new Worker<QueueJobPayload>(
  queueName,
  async (job) => {
    const { jobId } = job.data;
    let record = await readJobRecord(jobId);

    try {
      const totalSeconds = Math.max(1, record.data.durationSeconds);

      record = {
        ...record,
        status: "inProgress",
        results: {
          output: `Started by ${workerId}`
        }
      };
      await writeJobRecord(jobId, record);

      for (let second = 1; second <= totalSeconds; second += 1) {
        await sleep(1000);

        record = {
          ...record,
          results: {
            output: `Processed ${second}/${totalSeconds} seconds by ${workerId}`
          }
        };
        await writeJobRecord(jobId, record);
      }

      record = {
        ...record,
        status: "completed",
        results: {
          output: `${record.data.message} completed by ${workerId}`
        }
      };
      await writeJobRecord(jobId, record);
    } catch (error) {
      record = {
        ...record,
        status: "failed",
        results: {
          output: error instanceof Error ? error.message : "Unknown worker error"
        }
      };
      await writeJobRecord(jobId, record);
      throw error;
    }
  },
  {
    connection
  }
);

worker.on("completed", (job) => {
  console.log(`${serviceName} completed job ${job.data.jobId}`);
});

worker.on("failed", (job, error) => {
  console.error(`${serviceName} failed job ${job?.data.jobId ?? "unknown"}: ${error.message}`);
});

worker.on("error", (error) => {
  console.error(`${serviceName} error: ${error.message}`);
});

async function shutdown(): Promise<void> {
  await worker.close();
  redis.disconnect();
}

process.on("SIGINT", () => {
  void shutdown().then(() => process.exit(0));
});

process.on("SIGTERM", () => {
  void shutdown().then(() => process.exit(0));
});

console.log(`${serviceName} listening on queue ${queueName}`);
