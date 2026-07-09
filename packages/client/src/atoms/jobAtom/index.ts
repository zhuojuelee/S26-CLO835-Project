import { atom } from "jotai";
import { atomWithQuery } from "jotai-tanstack-query";
import type { JobsResponse } from "@clo835-project/shared";

const jobsEndpoint = "/api/jobs";
const jobsQueryKey = ["jobs"];
export const jobsPollingEnabledAtom = atom(true);

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
  refetchInterval: get(jobsPollingEnabledAtom) ? 500 : false
}));
