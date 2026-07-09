import type { Queue } from 'bullmq';
import {
  JOB_KEY_PREFIX,
  getJobKey,
  type JobRecord,
  type PendingJobRecord,
  type QueueJobPayload,
  type UnixTimestampMilliseconds,
} from '@clo835-project/shared';
import {
  createRetryJobRecord,
  failJobRecord,
  isRetryableJobRecord,
  isStaleJob,
} from '@clo835-project/shared/utils';
import type { JobRunner } from './getJobRunner.js';
import redis from '../redis/index.js';

export interface ScanAndRetryJobsOptions {
  jobQueue: Queue<QueueJobPayload>;
  jobRunner: JobRunner;
  now?: UnixTimestampMilliseconds;
}

export interface ScanAndRetryJobsResult {
  scanned: number;
  stale: number;
  retried: number;
  failed: number;
  exhausted: number;
  errors: Array<{
    key: string;
    jobId?: string;
    error: string;
  }>;
}

const queueRetryAttempts = 3;
const queueRetryBackoffMs = 1000;

export async function scanAndRetryJobs({
  jobQueue,
  jobRunner,
  now = Date.now(),
}: ScanAndRetryJobsOptions): Promise<ScanAndRetryJobsResult> {
  const result: ScanAndRetryJobsResult = {
    scanned: 0,
    stale: 0,
    retried: 0,
    failed: 0,
    exhausted: 0,
    errors: [],
  };
  let cursor = '0';

  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `${JOB_KEY_PREFIX}*`, 'COUNT', 100);
    cursor = nextCursor;

    if (keys.length === 0) {
      continue;
    }

    const values = await redis.mget(keys);

    for (const [index, value] of values.entries()) {
      const key = keys[index];

      if (!value) {
        continue;
      }

      result.scanned += 1;

      try {
        const record = JSON.parse(value) as JobRecord;

        if (!isRetryableJobRecord(record) || !isStaleJob(record, now)) {
          continue;
        }

        result.stale += 1;

        if (record.retries >= record.maxRetries) {
          if (record.status === 'failed') {
            result.exhausted += 1;
            continue;
          }

          const failedRecord = failJobRecord(
            record,
            `Job reached max retries (${record.retries}/${record.maxRetries}) after becoming stale`,
            now,
          );

          await redis.set(key, JSON.stringify(failedRecord));
          result.failed += 1;
          continue;
        }

        const retryRecord = createRetryJobRecord({ record, now });
        await redis.set(key, JSON.stringify(retryRecord));

        try {
          await dispatchRetry(retryRecord, jobQueue, jobRunner);
          result.retried += 1;
        } catch (error) {
          const failedRecord = failJobRecord(
            retryRecord,
            `Failed to dispatch retry ${retryRecord.retries}/${retryRecord.maxRetries}: ${getErrorMessage(error)}`,
          );

          await redis.set(key, JSON.stringify(failedRecord));
          result.errors.push({
            key,
            jobId: retryRecord.jobId,
            error: failedRecord.results.output,
          });
        }
      } catch (error) {
        result.errors.push({
          key,
          error: getErrorMessage(error),
        });
      }
    }
  } while (cursor !== '0');

  return result;
}

async function dispatchRetry(
  record: PendingJobRecord,
  jobQueue: Queue<QueueJobPayload>,
  jobRunner: JobRunner,
): Promise<void> {
  if (record.jobType === 'ephemeral') {
    await jobRunner.run(record.jobId);
    return;
  }

  await jobQueue.add(
    getJobKey(record.jobId),
    { jobId: record.jobId },
    {
      attempts: queueRetryAttempts,
      backoff: {
        type: 'fixed',
        delay: queueRetryBackoffMs,
      },
      jobId: `${record.jobId}-retry-${record.retries}`,
      removeOnComplete: true,
      removeOnFail: false,
    },
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown retry scanner error';
}
