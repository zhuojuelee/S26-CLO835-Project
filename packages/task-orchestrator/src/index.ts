import cors from 'cors';
import { CronJob } from 'cron';
import express from 'express';
import { Queue } from 'bullmq';
import {
  DEFAULT_BULLMQ_JOB_CONFIG,
  JOB_QUEUE_NAME,
  getJobKey,
  type CreateQueueJobRequest,
  type CreateQueueJobResponse,
  type CreateSpawnJobResponse,
  type HealthResponse,
  type JobRecord,
  type QueueJobPayload,
} from '@clo835-project/shared';
import { redisConnection } from './modules/redis/index.js';
import { getJobRunner } from './utils/getJobRunner.js';
import { createJobRecord, markJobFailed } from './utils/records.js';
import { scanAndRetryJobs } from './utils/scanAndRetryJob.js';

const port = Number(process.env.TASK_ORCHESTRATOR_PORT ?? process.env.PORT ?? 3001);
const serviceName = 'task-orchestrator';
const queueName = process.env.QUEUE_NAME ?? JOB_QUEUE_NAME;

// setting up job queue
const jobQueue = new Queue<QueueJobPayload>(queueName, {
  connection: redisConnection,
});

// ephemeral job runner
const jobRunner = getJobRunner();

// set up retry mechanism - static invocation
const retryCron = CronJob.from({
  cronTime: '*/5 * * * * *',
  onTick: async () => {
    const result = await scanAndRetryJobs({
      jobQueue,
      jobRunner,
    });

    if (result.stale > 0 || result.errors.length > 0) {
      console.log(
        `retry scan: scanned=${result.scanned} stale=${result.stale} retried=${result.retried} failed=${result.failed} exhausted=${result.exhausted} errors=${result.errors.length}`,
      );
    }

    for (const error of result.errors) {
      console.error(`retry scan failed for ${error.jobId ?? error.key}: ${error.error}`);
    }
  },
  start: true,
  waitForCompletion: true,
  errorHandler: (error) => {
    console.error(
      `retry scan error: ${error instanceof Error ? error.message : 'Unknown retry scanner error'}`,
    );
  },
});

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_request, response) => {
  const body: HealthResponse = {
    service: serviceName,
    ok: true,
    timestamp: new Date().toISOString(),
  };

  response.json(body);
});

app.post('/queueJob', async (request, response) => {
  let record: JobRecord;

  try {
    record = await createJobRecord(request.body as CreateQueueJobRequest, 'queue');
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : 'Invalid queue job request',
    });
    return;
  }

  try {
    await jobQueue.add(
      getJobKey(record.jobId),
      { jobId: record.jobId },
      {
        ...DEFAULT_BULLMQ_JOB_CONFIG,
        jobId: record.jobId,
      },
    );
  } catch (error) {
    const failedRecord = await markJobFailed(record, error, 'Failed to enqueue queue job');

    response.status(500).json({
      error: failedRecord.results.output,
      queueName,
      ...failedRecord,
    });
    return;
  }

  const responseBody: CreateQueueJobResponse = {
    queueName,
    ...record,
  };

  response.status(202).json(responseBody);
});

app.post('/spawnJob', async (request, response) => {
  let record: JobRecord;

  try {
    record = await createJobRecord(request.body as CreateQueueJobRequest, 'ephemeral');
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : 'Invalid spawned job request',
    });
    return;
  }

  try {
    await jobRunner.run(record.jobId, record.retries);
  } catch (error) {
    const failedRecord = await markJobFailed(record, error, 'Failed to spawn ephemeral job');

    response.status(500).json({
      error: failedRecord.results.output,
      runner: jobRunner.name,
      ...failedRecord,
    });
    return;
  }

  const responseBody: CreateSpawnJobResponse = {
    runner: jobRunner.name,
    ...record,
  };

  response.status(202).json(responseBody);
});

app.listen(port, () => {
  console.log(`${serviceName} listening on port ${port}`);
});
