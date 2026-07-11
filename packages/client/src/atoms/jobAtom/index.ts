import { atom } from 'jotai';
import { atomWithQuery } from 'jotai-tanstack-query';
import type { JobRecord, JobsResponse } from '@clo835-project/shared';

const jobsEndpoint = '/api/jobs';
const jobsQueryKey = ['jobs'];

export type JobStatusFilter = 'all' | JobRecord['status'];
export type JobTypeFilter = 'all' | JobRecord['jobType'];

export const jobsPollingEnabledAtom = atom(true);
export const jobStatusFilterAtom = atom<JobStatusFilter>('all');
export const jobTypeFilterAtom = atom<JobTypeFilter>('all');

async function fetchJobs(): Promise<JobsResponse> {
  const response = await fetch(jobsEndpoint);

  if (!response.ok) {
    throw new Error(`Failed to fetch jobs: ${response.status}`);
  }

  return response.json() as Promise<JobsResponse>;
}

export const jobsAtom = atomWithQuery<JobsResponse>((get) => ({
  queryKey: jobsQueryKey,
  queryFn: fetchJobs,
  refetchInterval: get(jobsPollingEnabledAtom) ? 500 : false,
}));
