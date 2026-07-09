export type JobType = 'queue' | 'ephemeral';

export const JOB_QUEUE_NAME = 'jobQueue';
export const JOB_KEY_PREFIX = 'job:';

export type Status = 'pending' | 'inProgress' | 'completed' | 'failed';
export type JobStatus = Status;

export interface JobData {
  durationSeconds: number;
  message: string;
}

export interface JobResults {
  output: string;
}

export interface JobRecord {
  jobId: string;
  jobType: JobType;
  status: JobStatus;
  data: JobData;
  results: JobResults;
}

export interface QueueJobPayload {
  jobId: string;
}

export interface CreateQueueJobRequest {
  durationSeconds: number;
  message: string;
  jobType: JobType;
}

export interface CreateQueueJobResponse extends JobRecord {
  queueName: string;
}

export interface CreateSpawnJobResponse extends JobRecord {
  runner: string;
}

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
