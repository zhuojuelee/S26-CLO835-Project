import { atomWithQuery } from 'jotai-tanstack-query';
import type { RuntimeConfigResponse } from '@clo835-project/shared';

const runtimeConfigEndpoint = '/api/runtime-config';
const runtimeConfigQueryKey = ['runtime-config'];

async function fetchRuntimeConfig(): Promise<RuntimeConfigResponse> {
  const response = await fetch(runtimeConfigEndpoint);

  if (!response.ok) {
    throw new Error(`Failed to fetch runtime config: ${response.status}`);
  }

  return response.json() as Promise<RuntimeConfigResponse>;
}

export const runtimeConfigAtom = atomWithQuery<RuntimeConfigResponse>(() => ({
  queryKey: runtimeConfigQueryKey,
  queryFn: fetchRuntimeConfig,
  staleTime: Infinity,
}));
