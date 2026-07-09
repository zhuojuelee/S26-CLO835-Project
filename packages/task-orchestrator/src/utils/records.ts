import { randomUUID } from 'node:crypto';
import { getJobKey, type CreateQueueJobRequest, type JobRecord } from '@clo835-project/shared';
import redis from '../redis/index.js';

export async function createJobRecord(
  request: CreateQueueJobRequest,
  expectedJobType: CreateQueueJobRequest['jobType'],
): Promise<JobRecord> {
  const { durationSeconds, message, jobType } = request;

  if (jobType !== expectedJobType) {
    throw new Error(`jobType must be ${expectedJobType}`);
  }

  const jobId = randomUUID();
  const record: JobRecord = {
    jobId,
    jobType,
    status: 'pending',
    data: {
      durationSeconds,
      message,
    },
    results: {
      output: '',
    },
  };

  await redis.set(getJobKey(jobId), JSON.stringify(record));
  return record;
}

export async function markJobFailed(record: JobRecord, error: unknown, fallback: string): Promise<JobRecord> {
  const failedRecord: JobRecord = {
    ...record,
    status: 'failed',
    results: {
      output: getErrorMessage(error, fallback),
    },
  };

  await redis.set(getJobKey(record.jobId), JSON.stringify(failedRecord));
  return failedRecord;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
