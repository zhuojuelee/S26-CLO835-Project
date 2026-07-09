export type JobMode = "queue" | "ephemeral";

export const JOB_QUEUE_NAME = "jobQueue";
export const JOB_KEY_PREFIX = "job:";

export type Status = "pending" | "inProgress" | "completed" | "failed";
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
}

export interface CreateQueueJobResponse extends JobRecord {
  queueName: string;
}

export type JobsResponse = Array<Record<string, JobRecord>>;

export function getJobKey(jobId: string): string {
  return `${JOB_KEY_PREFIX}${jobId}`;
}

export interface HealthResponse {
  service: string;
  ok: boolean;
  timestamp: string;
}
