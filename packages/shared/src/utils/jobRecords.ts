import { JOB_STALE_DURATION_MULTIPLIER } from '../index.js';
import type {
  CompletedJobRecord,
  FailedJobRecord,
  InProgressJobRecord,
  JobData,
  JobRecord,
  JobResults,
  JobType,
  PendingJobRecord,
  UnixTimestampMilliseconds,
} from '../index.js';

export type RetryableJobRecord = Exclude<JobRecord, { status: 'completed' }>;

export interface CreatePendingJobRecordOptions {
  jobId: string;
  jobType: JobType;
  data: JobData;
  maxRetries: number;
  results?: JobResults;
  retries?: number;
  now?: UnixTimestampMilliseconds;
}

export interface CreateRetryJobRecordOptions {
  record: RetryableJobRecord;
  now?: UnixTimestampMilliseconds;
}

export function getNextJobRetryCount(record: Pick<JobRecord, 'retries' | 'maxRetries'>): number {
  return Math.min(record.retries + 1, record.maxRetries);
}

export function createPendingJobRecord({
  jobId,
  jobType,
  data,
  maxRetries,
  results = { output: [] },
  retries = 0,
  now = Date.now(),
}: CreatePendingJobRecordOptions): PendingJobRecord {
  return {
    jobId,
    jobType,
    status: 'pending',
    data,
    results,
    retries,
    maxRetries,
    createdAt: now,
    updatedAt: now,
  };
}

export function createRetryJobRecord({
  record,
  now = Date.now(),
}: CreateRetryJobRecordOptions): PendingJobRecord {
  const retries = getNextJobRetryCount(record);

  return {
    jobId: record.jobId,
    jobType: record.jobType,
    status: 'pending',
    data: record.data,
    results: {
      output: appendJobOutput(
        record.results.output,
        `Retry ${retries}/${record.maxRetries} scheduled after stale ${record.status} job`,
      ),
    },
    retries,
    maxRetries: record.maxRetries,
    createdAt: record.createdAt,
    updatedAt: now,
  };
}

export function startJobRecord(
  record: JobRecord,
  output: string,
  now: UnixTimestampMilliseconds = Date.now(),
): InProgressJobRecord {
  return {
    jobId: record.jobId,
    jobType: record.jobType,
    status: 'inProgress',
    data: record.data,
    results: {
      output: appendJobOutput(record.results.output, output),
    },
    retries: record.retries,
    maxRetries: record.maxRetries,
    createdAt: record.createdAt,
    updatedAt: now,
    startedAt: now,
  };
}

export function updateJobProgress(
  record: InProgressJobRecord,
  output: string,
  now: UnixTimestampMilliseconds = Date.now(),
): InProgressJobRecord {
  return {
    ...record,
    results: {
      output: appendJobOutput(record.results.output, output),
    },
    updatedAt: now,
  };
}

export function completeJobRecord(
  record: InProgressJobRecord,
  output: string,
  now: UnixTimestampMilliseconds = Date.now(),
): CompletedJobRecord {
  return {
    ...record,
    status: 'completed',
    results: {
      output: appendJobOutput(record.results.output, output),
    },
    updatedAt: now,
    endedAt: now,
  };
}

export function failJobRecord(
  record: JobRecord,
  output: string,
  now: UnixTimestampMilliseconds = Date.now(),
): FailedJobRecord {
  const failedRecord: FailedJobRecord = {
    jobId: record.jobId,
    jobType: record.jobType,
    status: 'failed',
    data: record.data,
    results: {
      output: appendJobOutput(record.results.output, output),
    },
    retries: record.retries,
    maxRetries: record.maxRetries,
    createdAt: record.createdAt,
    updatedAt: now,
    endedAt: now,
  };

  if ('startedAt' in record && typeof record.startedAt === 'number') {
    failedRecord.startedAt = record.startedAt;
  }

  return failedRecord;
}

// A stale job is pending, in-progress, or failed for longer than 10x its expected duration window.
export function isStaleJob(record: RetryableJobRecord, now: UnixTimestampMilliseconds = Date.now()): boolean {
  const staleAfterMs = Math.max(1, record.data.durationSeconds) * 1000 * JOB_STALE_DURATION_MULTIPLIER;
  const stateStartedAt = getCurrentStateTimestamp(record);

  return now - stateStartedAt >= staleAfterMs;
}

export function isRetryableJobRecord(record: JobRecord): record is RetryableJobRecord {
  return record.status !== 'completed';
}

function getCurrentStateTimestamp(record: RetryableJobRecord): UnixTimestampMilliseconds {
  switch (record.status) {
    case 'pending':
      return getTimestamp(record.updatedAt) ?? record.createdAt;
    case 'inProgress':
      return getTimestamp(record.startedAt) ?? getTimestamp(record.updatedAt) ?? record.createdAt;
    case 'failed':
      return getTimestamp(record.endedAt) ?? getTimestamp(record.updatedAt) ?? record.createdAt;
  }
}

function getTimestamp(value: unknown): UnixTimestampMilliseconds | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  return value;
}

export function normalizeJobOutput(output: unknown): string[] {
  if (Array.isArray(output)) {
    return output.filter((message): message is string => typeof message === 'string');
  }

  if (typeof output === 'string' && output.length > 0) {
    return [output];
  }

  return [];
}

export function getLatestJobOutput(output: unknown): string {
  return normalizeJobOutput(output).at(-1) ?? '';
}

function appendJobOutput(output: unknown, message: string): string[] {
  return [...normalizeJobOutput(output), message];
}
