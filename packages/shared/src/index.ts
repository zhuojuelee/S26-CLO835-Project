export type JobType = 'queue' | 'ephemeral';

export const JOB_QUEUE_NAME = 'jobQueue';
export const JOB_KEY_PREFIX = 'job:';

export type Status = 'pending' | 'inProgress' | 'completed' | 'failed';
export type JobStatus = Status;
export type RetryableJobStatus = Exclude<JobStatus, 'completed'>;
export type UnixTimestampMilliseconds = number;

export const DEFAULT_JOB_MAX_RETRIES = 3;
export const JOB_STALE_DURATION_MULTIPLIER = 10;
export const RETRYABLE_JOB_STATUSES = [
  'pending',
  'inProgress',
  'failed',
] as const satisfies readonly RetryableJobStatus[];

export interface JobData {
  durationSeconds: number;
  message: string;
}

export interface JobResults {
  output: string;
}

interface BaseJobRecord {
  jobId: string;
  jobType: JobType;
  data: JobData;
  results: JobResults;
  retries: number;
  maxRetries: number;
  createdAt: UnixTimestampMilliseconds;
  updatedAt: UnixTimestampMilliseconds;
}

export interface PendingJobRecord extends BaseJobRecord {
  status: 'pending';
  startedAt?: never;
  endedAt?: never;
}

export interface InProgressJobRecord extends BaseJobRecord {
  status: 'inProgress';
  startedAt: UnixTimestampMilliseconds;
  endedAt?: never;
}

export interface CompletedJobRecord extends BaseJobRecord {
  status: 'completed';
  startedAt: UnixTimestampMilliseconds;
  endedAt: UnixTimestampMilliseconds;
}

export interface FailedJobRecord extends BaseJobRecord {
  status: 'failed';
  startedAt?: UnixTimestampMilliseconds;
  endedAt: UnixTimestampMilliseconds;
}

export type JobRecord = PendingJobRecord | InProgressJobRecord | CompletedJobRecord | FailedJobRecord;

export interface QueueJobPayload {
  jobId: string;
}

export interface CreateQueueJobRequest {
  durationSeconds: number;
  message: string;
  jobType: JobType;
}

export type CreateQueueJobResponse = JobRecord & {
  queueName: string;
};

export type CreateSpawnJobResponse = JobRecord & {
  runner: string;
};

export type CreateJobResponse = CreateQueueJobResponse | CreateSpawnJobResponse;

export type JobsResponse = Array<Record<string, JobRecord>>;

export interface DeleteJobsResponse {
  deleted: number;
}

export function getJobKey(jobId: string): string {
  return `${JOB_KEY_PREFIX}${jobId}`;
}

export interface HealthResponse {
  service: string;
  ok: boolean;
  timestamp: string;
}

export * from './utils/index.js';
