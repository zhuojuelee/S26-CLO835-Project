import cors from 'cors';
import express from 'express';
import { Queue } from 'bullmq';
import {
  JOB_QUEUE_NAME,
  getJobKey,
  type CreateQueueJobRequest,
  type CreateQueueJobResponse,
  type CreateSpawnJobResponse,
  type HealthResponse,
  type JobRecord,
  type QueueJobPayload,
} from '@clo835-project/shared';
import { redisConnection } from './redis/index.js';
import { getJobRunner } from './utils/getJobRunner.js';
import { createJobRecord, markJobFailed } from './utils/records.js';

const port = Number(process.env.TASK_ORCHESTRATOR_PORT ?? process.env.PORT ?? 3001);
const serviceName = 'task-orchestrator';
const queueName = process.env.QUEUE_NAME ?? JOB_QUEUE_NAME;

const jobQueue = new Queue<QueueJobPayload>(queueName, {
  connection: redisConnection,
});
const jobRunner = getJobRunner();

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
        attempts: 3,
        backoff: {
          type: 'fixed',
          delay: 1000,
        },
        jobId: record.jobId,
        removeOnComplete: true,
        removeOnFail: false,
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
    await jobRunner.run(record.jobId);
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
