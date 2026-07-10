import { randomUUID } from 'node:crypto';
import {
  DEFAULT_JOB_MAX_RETRIES,
  getJobKey,
  type CreateQueueJobRequest,
  type JobRecord,
} from '@clo835-project/shared';
import { createPendingJobRecord, failJobRecord } from '@clo835-project/shared/utils';
import redis from '../modules/redis/index.js';

export async function createJobRecord(
  request: CreateQueueJobRequest,
  expectedJobType: CreateQueueJobRequest['jobType'],
): Promise<JobRecord> {
  const { durationSeconds, message, jobType } = request;

  if (jobType !== expectedJobType) {
    throw new Error(`jobType must be ${expectedJobType}`);
  }

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error('durationSeconds must be a positive number');
  }

  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    throw new Error('message is required');
  }

  const jobId = randomUUID();
  const record: JobRecord = createPendingJobRecord({
    jobId,
    jobType,
    data: {
      durationSeconds,
      message: trimmedMessage,
    },
    maxRetries: DEFAULT_JOB_MAX_RETRIES,
  });

  await redis.set(getJobKey(jobId), JSON.stringify(record));
  return record;
}

export async function markJobFailed(record: JobRecord, error: unknown, fallback: string): Promise<JobRecord> {
  const failedRecord = failJobRecord(record, getErrorMessage(error, fallback));

  await redis.set(getJobKey(record.jobId), JSON.stringify(failedRecord));
  return failedRecord;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
