export type JobMode = "queue" | "ephemeral";

export interface BaseJobRequest {
  studentId: string;
  durationSeconds: number;
  message?: string;
}

export interface QueueJobRequest extends BaseJobRequest {
  mode: "queue";
  batchId?: string;
}

export interface EphemeralJobRequest extends BaseJobRequest {
  mode: "ephemeral";
}

export interface JobAcceptedResponse {
  jobId: string;
  mode: JobMode;
  acceptedAt: string;
}

export interface HealthResponse {
  service: string;
  ok: boolean;
  timestamp: string;
}
